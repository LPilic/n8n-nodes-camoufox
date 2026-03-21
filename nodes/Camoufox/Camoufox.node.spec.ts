import { Camoufox } from './Camoufox.node';

jest.mock('playwright-core', () => ({
	firefox: {
		connect: jest.fn(),
	},
}));

import { firefox } from 'playwright-core';

const mockPage = {
	goto: jest.fn(),
	url: jest.fn().mockReturnValue('https://example.com'),
	title: jest.fn().mockResolvedValue('Example'),
	content: jest.fn().mockResolvedValue('<html><body><h1>Example</h1></body></html>'),
	innerText: jest.fn().mockResolvedValue('Example Domain'),
	click: jest.fn(),
	fill: jest.fn(),
	type: jest.fn(),
	waitForSelector: jest.fn(),
	waitForTimeout: jest.fn(),
	evaluate: jest.fn(),
	$$: jest.fn().mockResolvedValue([]),
	$: jest.fn(),
	screenshot: jest.fn(),
	close: jest.fn(),
};

const mockContext = {
	newPage: jest.fn().mockResolvedValue(mockPage),
	close: jest.fn(),
};

const mockBrowser = {
	newContext: jest.fn().mockResolvedValue(mockContext),
};

function createCtx(params: Record<string, any>, credentials: Record<string, any> = {}) {
	const creds = { wsEndpoint: 'ws://localhost:9222', ...credentials };
	return {
		getInputData: () => [{ json: {} }],
		getCredentials: jest.fn().mockResolvedValue(creds),
		getNodeParameter: jest.fn().mockImplementation((name: string) => {
			if (params[name] !== undefined) return params[name];
			// Defaults for shared fields
			if (name === 'waitUntil') return 'load';
			if (name === 'timeout') return 30000;
			if (name === 'waitForSelector') return '';
			if (name === 'preActions') return {};
			throw new Error(`Unexpected parameter: ${name}`);
		}),
		getNode: () => ({ name: 'Camoufox', type: 'n8n-nodes-camoufox.camoufox' }),
		continueOnFail: () => false,
		helpers: {
			prepareBinaryData: jest.fn().mockResolvedValue({ data: 'base64', mimeType: 'image/png' }),
		},
	};
}

describe('Camoufox Node', () => {
	const node = new Camoufox();

	beforeEach(() => {
		jest.clearAllMocks();
		(firefox.connect as jest.Mock).mockResolvedValue(mockBrowser);
		mockPage.goto.mockResolvedValue({ status: () => 200 });
	});

	describe('description', () => {
		it('should have correct metadata', () => {
			expect(node.description.name).toBe('camoufox');
			expect(node.description.usableAsTool).toBe(true);
			expect(node.description.credentials).toEqual([{ name: 'camoufoxApi', required: true }]);
		});

		it('should not have a resource selector', () => {
			const resourceProp = node.description.properties.find((p) => p.name === 'resource');
			expect(resourceProp).toBeUndefined();
		});

		it('should have 4 operations', () => {
			const opProp = node.description.properties.find((p) => p.name === 'operation');
			expect(opProp).toBeDefined();
			const ops = (opProp as any).options.map((o: any) => o.value);
			expect(ops).toEqual(['getPageContent', 'extractElements', 'screenshot', 'runScript']);
		});

		it('should have shared URL field without displayOptions', () => {
			const urlProp = node.description.properties.find((p) => p.name === 'url');
			expect(urlProp).toBeDefined();
			expect(urlProp!.required).toBe(true);
			expect((urlProp as any).displayOptions).toBeUndefined();
		});

		it('should have pre-actions field', () => {
			const preActions = node.description.properties.find((p) => p.name === 'preActions');
			expect(preActions).toBeDefined();
			expect(preActions!.type).toBe('fixedCollection');
		});
	});

	describe('Get Page Content', () => {
		it('should navigate and return html + text', async () => {
			const ctx = createCtx({ operation: 'getPageContent', url: 'https://example.com' });
			const result = await node.execute.call(ctx as any);

			expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'load', timeout: 30000 });
			expect(result[0][0].json).toEqual({
				url: 'https://example.com',
				title: 'Example',
				status: 200,
				html: '<html><body><h1>Example</h1></body></html>',
				text: 'Example Domain',
			});
		});

		it('should wait for selector when specified', async () => {
			const ctx = createCtx({
				operation: 'getPageContent',
				url: 'https://example.com',
				waitForSelector: '#content',
			});
			await node.execute.call(ctx as any);

			expect(mockPage.waitForSelector).toHaveBeenCalledWith('#content', { state: 'visible', timeout: 30000 });
		});
	});

	describe('Pre-actions', () => {
		it('should run click action before extracting', async () => {
			const ctx = createCtx({
				operation: 'getPageContent',
				url: 'https://example.com',
				preActions: {
					actions: [{ actionType: 'click', selector: '.cookie-accept' }],
				},
			});
			await node.execute.call(ctx as any);

			expect(mockPage.click).toHaveBeenCalledWith('.cookie-accept');
		});

		it('should run multiple actions in order', async () => {
			const callOrder: string[] = [];
			mockPage.click.mockImplementation(() => { callOrder.push('click'); });
			mockPage.waitForTimeout.mockImplementation(() => { callOrder.push('delay'); });

			const ctx = createCtx({
				operation: 'getPageContent',
				url: 'https://example.com',
				preActions: {
					actions: [
						{ actionType: 'click', selector: '#btn' },
						{ actionType: 'delay', ms: 2000 },
					],
				},
			});
			await node.execute.call(ctx as any);

			expect(callOrder).toEqual(['click', 'delay']);
			expect(mockPage.waitForTimeout).toHaveBeenCalledWith(2000);
		});

		it('should scroll to bottom', async () => {
			const ctx = createCtx({
				operation: 'getPageContent',
				url: 'https://example.com',
				preActions: {
					actions: [{ actionType: 'scrollToBottom' }],
				},
			});
			await node.execute.call(ctx as any);

			expect(mockPage.evaluate).toHaveBeenCalled();
			expect(mockPage.waitForTimeout).toHaveBeenCalledWith(500);
		});
	});

	describe('Extract Elements', () => {
		it('should extract text from elements', async () => {
			const mockElements = [
				{ innerText: jest.fn().mockResolvedValue('Item 1') },
				{ innerText: jest.fn().mockResolvedValue('Item 2') },
			];
			mockPage.$$.mockResolvedValue(mockElements);

			const ctx = createCtx({
				operation: 'extractElements',
				url: 'https://example.com',
				selector: '.item',
				extractType: 'text',
			});
			const result = await node.execute.call(ctx as any);

			expect(result[0]).toHaveLength(2);
			expect(result[0][0].json.text).toBe('Item 1');
			expect(result[0][1].json.text).toBe('Item 2');
		});

		it('should extract innerHTML', async () => {
			const mockElements = [
				{ innerHTML: jest.fn().mockResolvedValue('<span>Hello</span>') },
			];
			mockPage.$$.mockResolvedValue(mockElements);

			const ctx = createCtx({
				operation: 'extractElements',
				url: 'https://example.com',
				selector: '.content',
				extractType: 'innerHTML',
			});
			const result = await node.execute.call(ctx as any);

			expect(result[0][0].json.innerHTML).toBe('<span>Hello</span>');
		});

		it('should extract attributes', async () => {
			const mockElements = [
				{ getAttribute: jest.fn().mockResolvedValue('https://img1.png') },
			];
			mockPage.$$.mockResolvedValue(mockElements);

			const ctx = createCtx({
				operation: 'extractElements',
				url: 'https://example.com',
				selector: 'img',
				extractType: 'attribute',
				attributeName: 'src',
			});
			const result = await node.execute.call(ctx as any);

			expect(result[0][0].json.value).toBe('https://img1.png');
		});

		it('should extract links', async () => {
			mockPage.evaluate.mockResolvedValue([
				{ text: 'Home', href: 'https://example.com/' },
			]);

			const ctx = createCtx({
				operation: 'extractElements',
				url: 'https://example.com',
				selector: 'nav',
				extractType: 'links',
			});
			const result = await node.execute.call(ctx as any);

			expect(result[0][0].json.text).toBe('Home');
			expect(result[0][0].json.href).toBe('https://example.com/');
		});

		it('should return count 0 when no elements found', async () => {
			mockPage.$$.mockResolvedValue([]);

			const ctx = createCtx({
				operation: 'extractElements',
				url: 'https://example.com',
				selector: '.missing',
				extractType: 'text',
			});
			const result = await node.execute.call(ctx as any);

			expect(result[0][0].json.count).toBe(0);
		});
	});

	describe('Screenshot', () => {
		it('should take full page screenshot', async () => {
			mockPage.screenshot.mockResolvedValue(Buffer.from('png'));

			const ctx = createCtx({
				operation: 'screenshot',
				url: 'https://example.com',
				captureType: 'fullPage',
				imageFormat: 'png',
				binaryProperty: 'data',
			});
			const result = await node.execute.call(ctx as any);

			expect(mockPage.screenshot).toHaveBeenCalledWith({ fullPage: true, type: 'png', quality: undefined });
			expect(result[0][0].binary).toBeDefined();
		});

		it('should take element screenshot', async () => {
			const mockEl = { screenshot: jest.fn().mockResolvedValue(Buffer.from('png')) };
			mockPage.$.mockResolvedValue(mockEl);

			const ctx = createCtx({
				operation: 'screenshot',
				url: 'https://example.com',
				captureType: 'element',
				screenshotSelector: '#hero',
				imageFormat: 'png',
				binaryProperty: 'data',
			});
			const result = await node.execute.call(ctx as any);

			expect(mockEl.screenshot).toHaveBeenCalled();
			expect(result[0][0].binary).toBeDefined();
		});
	});

	describe('Run Script', () => {
		it('should evaluate JS and return result', async () => {
			mockPage.evaluate.mockResolvedValue(42);

			const ctx = createCtx({
				operation: 'runScript',
				url: 'https://example.com',
				jsCode: '1 + 41',
			});
			const result = await node.execute.call(ctx as any);

			expect(result[0][0].json.result).toEqual({ value: 42 });
		});

		it('should return object results directly', async () => {
			mockPage.evaluate.mockResolvedValue({ count: 5, items: ['a', 'b'] });

			const ctx = createCtx({
				operation: 'runScript',
				url: 'https://example.com',
				jsCode: '({count: 5, items: ["a","b"]})',
			});
			const result = await node.execute.call(ctx as any);

			expect(result[0][0].json.result).toEqual({ count: 5, items: ['a', 'b'] });
		});
	});

	describe('Proxy configuration', () => {
		it('should pass proxy to browser context', async () => {
			const ctx = createCtx(
				{ operation: 'getPageContent', url: 'https://example.com' },
				{ useProxy: true, proxyServer: 'http://proxy:8080', proxyUsername: 'u', proxyPassword: 'p', proxyBypass: 'localhost' },
			);
			await node.execute.call(ctx as any);

			expect(mockBrowser.newContext).toHaveBeenCalledWith({
				proxy: { server: 'http://proxy:8080', username: 'u', password: 'p', bypass: 'localhost' },
			});
		});
	});

	describe('Error handling', () => {
		it('should close session on error', async () => {
			mockPage.goto.mockRejectedValue(new Error('timeout'));

			const ctx = createCtx({ operation: 'getPageContent', url: 'https://bad.com' });
			await expect(node.execute.call(ctx as any)).rejects.toThrow('timeout');
			expect(mockPage.close).toHaveBeenCalled();
		});

		it('should continue on fail when enabled', async () => {
			mockPage.goto.mockRejectedValue(new Error('timeout'));

			const ctx = createCtx({ operation: 'getPageContent', url: 'https://bad.com' });
			(ctx as any).continueOnFail = () => true;

			const result = await node.execute.call(ctx as any);
			expect(result[0][0].json.error).toBe('timeout');
		});

		it('should throw on connection failure', async () => {
			(firefox.connect as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

			const ctx = createCtx({ operation: 'getPageContent', url: 'https://example.com' });
			await expect(node.execute.call(ctx as any)).rejects.toThrow();
		});
	});
});
