import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { Page } from 'playwright-core';

import {
	resolveWsEndpoint,
	connectToCamoufox,
	closeCamoufoxSession,
	scrapeTable,
	CamoufoxSession,
	ProxyConfig,
} from './GenericFunctions';

import {
	operationField,
	sharedFields,
	extractFields,
	screenshotFields,
	scriptFields,
} from './descriptions/OperationDescription';

async function runPreActions(
	page: Page,
	preActions: { actions?: Array<{ actionType: string; selector?: string; value?: string; ms?: number }> },
): Promise<void> {
	const actions = preActions.actions || [];
	for (const action of actions) {
		switch (action.actionType) {
			case 'click':
				if (action.selector) await page.click(action.selector);
				break;
			case 'fill':
				if (action.selector) await page.fill(action.selector, action.value || '');
				break;
			case 'type':
				if (action.selector) await page.type(action.selector, action.value || '', { delay: 50 });
				break;
			case 'wait':
				if (action.selector) await page.waitForSelector(action.selector, { state: 'visible' });
				break;
			case 'scrollToBottom':
				await page.evaluate('window.scrollTo(0, document.body.scrollHeight)' as any);
				await page.waitForTimeout(500);
				break;
			case 'delay':
				await page.waitForTimeout(action.ms || 1000);
				break;
		}
	}
}

export class Camoufox implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Camoufox',
		name: 'camoufox',
		icon: 'file:logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Scrape websites with a stealth anti-detect browser',
		defaults: {
			name: 'Camoufox',
		},
		usableAsTool: true,
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'camoufoxApi',
				required: true,
			},
		],
		properties: [
			...operationField,
			...sharedFields,
			...extractFields,
			...screenshotFields,
			...scriptFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('camoufoxApi');
		const wsEndpoint = await resolveWsEndpoint(credentials.wsEndpoint as string);
		const ignoreHttpsErrors = credentials.ignoreHttpsErrors as boolean;

		let proxy: ProxyConfig | undefined;
		if (credentials.useProxy) {
			proxy = { server: credentials.proxyServer as string };
			if (credentials.proxyUsername) proxy.username = credentials.proxyUsername as string;
			if (credentials.proxyPassword) proxy.password = credentials.proxyPassword as string;
			if (credentials.proxyBypass) proxy.bypass = credentials.proxyBypass as string;
		}

		let session: CamoufoxSession | undefined;

		try {
			session = await connectToCamoufox(this, wsEndpoint, proxy, ignoreHttpsErrors);
			const { page } = session;

			for (let i = 0; i < items.length; i++) {
				try {
					const operation = this.getNodeParameter('operation', i) as string;
					const url = this.getNodeParameter('url', i) as string;
					const waitUntil = this.getNodeParameter('waitUntil', i) as 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
					const timeout = this.getNodeParameter('timeout', i) as number;
					const waitForSelector = this.getNodeParameter('waitForSelector', i) as string;
					const preActions = this.getNodeParameter('preActions', i) as any;

					// Step 1: Navigate
					const response = await page.goto(url, { waitUntil, timeout });
					const status = response?.status() ?? null;

					// Step 2: Wait for selector (if specified)
					if (waitForSelector) {
						await page.waitForSelector(waitForSelector, { state: 'visible', timeout });
					}

					// Step 3: Run pre-actions
					if (preActions) {
						await runPreActions(page, preActions);
					}

					// Step 4: Execute operation
					if (operation === 'getPageContent') {
						returnData.push({
							json: {
								url: page.url(),
								title: await page.title(),
								status,
								html: await page.content(),
								text: await page.innerText('body'),
							},
							pairedItem: { item: i },
						});
					}

					if (operation === 'extractElements') {
						const selector = this.getNodeParameter('selector', i) as string;
						const extractType = this.getNodeParameter('extractType', i) as string;

						if (extractType === 'links') {
							const getLinksJs = `(sel) => {
								const root = document.querySelector(sel) || document;
								const anchors = root.querySelectorAll('a[href]');
								return Array.from(anchors).map((a) => ({
									text: a.innerText.trim(),
									href: a.href,
								}));
							}`;
							const links: Array<{ text: string; href: string }> = await page.evaluate(getLinksJs as any, selector || 'body');

							for (const link of links) {
								returnData.push({ json: { ...link, url: page.url() }, pairedItem: { item: i } });
							}
							if (links.length === 0) {
								returnData.push({ json: { url: page.url(), count: 0 }, pairedItem: { item: i } });
							}
						} else if (extractType === 'table') {
							const rows = await scrapeTable(page, selector);

							for (const row of rows) {
								returnData.push({ json: { ...row, _sourceUrl: page.url() }, pairedItem: { item: i } });
							}
							if (rows.length === 0) {
								returnData.push({ json: { url: page.url(), count: 0 }, pairedItem: { item: i } });
							}
						} else if (extractType === 'attribute') {
							const attributeName = this.getNodeParameter('attributeName', i) as string;
							const elements = await page.$$(selector);

							for (const el of elements) {
								const value = await el.getAttribute(attributeName);
								returnData.push({ json: { selector, attribute: attributeName, value, url: page.url() }, pairedItem: { item: i } });
							}
							if (elements.length === 0) {
								returnData.push({ json: { url: page.url(), selector, count: 0 }, pairedItem: { item: i } });
							}
						} else {
							// text, innerHTML, outerHTML
							const elements = await page.$$(selector);

							for (const el of elements) {
								let content: string;
								if (extractType === 'innerHTML') {
									content = await el.innerHTML();
								} else if (extractType === 'outerHTML') {
									content = await el.evaluate('(node) => node.outerHTML' as any);
								} else {
									content = await el.innerText();
								}
								returnData.push({
									json: { selector, [extractType]: content, url: page.url() },
									pairedItem: { item: i },
								});
							}
							if (elements.length === 0) {
								returnData.push({ json: { url: page.url(), selector, count: 0 }, pairedItem: { item: i } });
							}
						}
					}

					if (operation === 'screenshot') {
						const captureType = this.getNodeParameter('captureType', i) as string;
						const imageFormat = this.getNodeParameter('imageFormat', i) as 'png' | 'jpeg';
						const binaryProperty = this.getNodeParameter('binaryProperty', i) as string;
						const quality = imageFormat === 'jpeg'
							? this.getNodeParameter('quality', i) as number
							: undefined;

						let buffer: Buffer;

						if (captureType === 'element') {
							const screenshotSelector = this.getNodeParameter('screenshotSelector', i) as string;
							const element = await page.$(screenshotSelector);
							if (!element) {
								throw new Error(`Element not found: ${screenshotSelector}`);
							}
							buffer = await element.screenshot({ type: imageFormat, quality });
						} else {
							buffer = await page.screenshot({
								fullPage: captureType === 'fullPage',
								type: imageFormat,
								quality,
							});
						}

						const binaryData = await this.helpers.prepareBinaryData(
							buffer,
							`screenshot.${imageFormat}`,
							imageFormat === 'png' ? 'image/png' : 'image/jpeg',
						);

						returnData.push({
							json: { url: page.url(), title: await page.title(), status },
							binary: { [binaryProperty]: binaryData },
							pairedItem: { item: i },
						});
					}

					if (operation === 'runScript') {
						const jsCode = this.getNodeParameter('jsCode', i) as string;
						const result = await page.evaluate(jsCode);

						returnData.push({
							json: {
								url: page.url(),
								result: typeof result === 'object' && result !== null ? result : { value: result },
							},
							pairedItem: { item: i },
						});
					}

				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: { error: (error as Error).message },
							pairedItem: { item: i },
						});
						continue;
					}
					throw error;
				}
			}
		} finally {
			if (session) {
				await closeCamoufoxSession(session);
			}
		}

		return [returnData];
	}
}
