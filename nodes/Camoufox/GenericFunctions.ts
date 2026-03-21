import { firefox, Browser, Page, BrowserContext } from 'playwright-core';
import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';

export interface ProxyConfig {
	server: string;
	username?: string;
	password?: string;
	bypass?: string;
}

export interface CamoufoxSession {
	browser: Browser;
	context: BrowserContext;
	page: Page;
}

export async function connectToCamoufox(
	ctx: IExecuteFunctions,
	wsEndpoint: string,
	proxy?: ProxyConfig,
	ignoreHttpsErrors?: boolean,
): Promise<CamoufoxSession> {
	let browser: Browser;
	try {
		browser = await firefox.connect(wsEndpoint);
	} catch (error) {
		throw new NodeOperationError(ctx.getNode(), `Failed to connect to Camoufox at ${wsEndpoint}: ${(error as Error).message}`);
	}

	const contextOptions: Record<string, any> = {};
	if (ignoreHttpsErrors) {
		contextOptions.ignoreHTTPSErrors = true;
	}
	if (proxy) {
		const pw: Record<string, string> = { server: proxy.server };
		if (proxy.username) pw.username = proxy.username;
		if (proxy.password) pw.password = proxy.password;
		if (proxy.bypass) pw.bypass = proxy.bypass;
		contextOptions.proxy = pw;
	}

	const context = await browser.newContext(contextOptions);
	const page = await context.newPage();

	return { browser, context, page };
}

export async function closeCamoufoxSession(session: CamoufoxSession): Promise<void> {
	try {
		await session.page.close();
	} catch (_e) { /* ignore */ }
	try {
		await session.context.close();
	} catch (_e) { /* ignore */ }
}

const SCRAPE_TABLE_JS = `
(sel) => {
	const table = document.querySelector(sel);
	if (!table) return [];
	const headers = [];
	const headerCells = table.querySelectorAll('thead th, thead td, tr:first-child th, tr:first-child td');
	headerCells.forEach((cell) => headers.push(cell.innerText.trim()));
	const rows = [];
	const bodyRows = table.querySelectorAll('tbody tr');
	const dataRows = bodyRows.length > 0 ? bodyRows : table.querySelectorAll('tr');
	const startIdx = bodyRows.length > 0 ? 0 : 1;
	for (let i = startIdx; i < dataRows.length; i++) {
		const cells = dataRows[i].querySelectorAll('td, th');
		const row = {};
		cells.forEach((cell, j) => {
			const key = headers[j] || 'col_' + j;
			row[key] = cell.innerText.trim();
		});
		rows.push(row);
	}
	return rows;
}
`;

export async function scrapeTable(page: Page, selector: string): Promise<Record<string, string>[]> {
	return page.evaluate(SCRAPE_TABLE_JS as any, selector);
}
