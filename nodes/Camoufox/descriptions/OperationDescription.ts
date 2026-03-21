import { INodeProperties } from 'n8n-workflow';

export const operationField: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Get Page Content',
				value: 'getPageContent',
				description: 'Navigate to a URL and return the full page HTML, title, and visible text',
				action: 'Get page content',
			},
			{
				name: 'Extract Elements',
				value: 'extractElements',
				description: 'Navigate to a URL and extract data from elements matching a CSS selector',
				action: 'Extract elements from a page',
			},
			{
				name: 'Screenshot',
				value: 'screenshot',
				description: 'Navigate to a URL and capture a screenshot',
				action: 'Take a screenshot',
			},
			{
				name: 'Run Script',
				value: 'runScript',
				description: 'Navigate to a URL and execute custom JavaScript',
				action: 'Run a script on a page',
			},
		],
		default: 'getPageContent',
	},
];

// ============================================================
// Shared fields (URL, navigation, pre-actions) — shown for ALL operations
// ============================================================

export const sharedFields: INodeProperties[] = [
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'https://example.com',
		description: 'The URL to navigate to',
	},
	{
		displayName: 'Wait Until',
		name: 'waitUntil',
		type: 'options',
		default: 'load',
		options: [
			{ name: 'DOM Content Loaded', value: 'domcontentloaded' },
			{ name: 'Load', value: 'load' },
			{ name: 'Network Idle', value: 'networkidle' },
			{ name: 'Commit', value: 'commit' },
		],
		description: 'When to consider navigation succeeded',
	},
	{
		displayName: 'Wait for Selector',
		name: 'waitForSelector',
		type: 'string',
		default: '',
		placeholder: '#content, .main-article',
		description: 'Optional CSS selector to wait for after navigation (useful for dynamic/JS-rendered pages)',
	},
	{
		displayName: 'Timeout (Ms)',
		name: 'timeout',
		type: 'number',
		default: 30000,
		description: 'Maximum time to wait for navigation and selectors in milliseconds',
	},
	{
		displayName: 'Actions Before Extract',
		name: 'preActions',
		type: 'fixedCollection',
		default: {},
		placeholder: 'Add Action',
		description: 'Optional actions to perform after navigation but before extracting data (e.g. close cookie banner, click "load more", scroll)',
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Action',
				name: 'actions',
				values: [
					{
						displayName: 'Action Type',
						name: 'actionType',
						type: 'options',
						default: 'click',
						options: [
							{ name: 'Click', value: 'click' },
							{ name: 'Fill', value: 'fill' },
							{ name: 'Type', value: 'type' },
							{ name: 'Wait for Selector', value: 'wait' },
							{ name: 'Scroll to Bottom', value: 'scrollToBottom' },
							{ name: 'Wait (Ms)', value: 'delay' },
						],
					},
					{
						displayName: 'Selector',
						name: 'selector',
						type: 'string',
						default: '',
						placeholder: '.cookie-accept, button#load-more',
						description: 'CSS selector for the target element',
						displayOptions: {
							show: {
								actionType: ['click', 'fill', 'type', 'wait'],
							},
						},
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
						description: 'Text to fill or type into the element',
						displayOptions: {
							show: {
								actionType: ['fill', 'type'],
							},
						},
					},
					{
						displayName: 'Milliseconds',
						name: 'ms',
						type: 'number',
						default: 1000,
						description: 'Time to wait in milliseconds',
						displayOptions: {
							show: {
								actionType: ['delay'],
							},
						},
					},
				],
			},
		],
	},
];

// ============================================================
// Extract Elements fields
// ============================================================

export const extractFields: INodeProperties[] = [
	{
		displayName: 'CSS Selector',
		name: 'selector',
		type: 'string',
		required: true,
		default: '',
		placeholder: '.product-card, table.results tr',
		displayOptions: {
			show: {
				operation: ['extractElements'],
			},
		},
		description: 'CSS selector for elements to extract. Each matching element becomes a separate output item.',
	},
	{
		displayName: 'Extract',
		name: 'extractType',
		type: 'options',
		default: 'text',
		displayOptions: {
			show: {
				operation: ['extractElements'],
			},
		},
		options: [
			{ name: 'Text Content', value: 'text' },
			{ name: 'Inner HTML', value: 'innerHTML' },
			{ name: 'Outer HTML', value: 'outerHTML' },
			{ name: 'Attribute', value: 'attribute' },
			{ name: 'All Links', value: 'links' },
			{ name: 'Table Data', value: 'table' },
		],
		description: 'What data to extract from each matching element',
	},
	{
		displayName: 'Attribute Name',
		name: 'attributeName',
		type: 'string',
		default: '',
		placeholder: 'href, src, data-id',
		displayOptions: {
			show: {
				operation: ['extractElements'],
				extractType: ['attribute'],
			},
		},
		description: 'The attribute to extract from each element',
	},
];

// ============================================================
// Screenshot fields
// ============================================================

export const screenshotFields: INodeProperties[] = [
	{
		displayName: 'Capture',
		name: 'captureType',
		type: 'options',
		default: 'fullPage',
		displayOptions: {
			show: {
				operation: ['screenshot'],
			},
		},
		options: [
			{ name: 'Full Page', value: 'fullPage' },
			{ name: 'Viewport Only', value: 'viewport' },
			{ name: 'Element', value: 'element' },
		],
		description: 'What to capture in the screenshot',
	},
	{
		displayName: 'Element Selector',
		name: 'screenshotSelector',
		type: 'string',
		default: '',
		placeholder: '#main-content',
		displayOptions: {
			show: {
				operation: ['screenshot'],
				captureType: ['element'],
			},
		},
		description: 'CSS selector of the element to screenshot',
	},
	{
		displayName: 'Image Format',
		name: 'imageFormat',
		type: 'options',
		default: 'png',
		displayOptions: {
			show: {
				operation: ['screenshot'],
			},
		},
		options: [
			{ name: 'PNG', value: 'png' },
			{ name: 'JPEG', value: 'jpeg' },
		],
	},
	{
		displayName: 'Quality',
		name: 'quality',
		type: 'number',
		default: 80,
		typeOptions: { minValue: 0, maxValue: 100 },
		displayOptions: {
			show: {
				operation: ['screenshot'],
				imageFormat: ['jpeg'],
			},
		},
		description: 'JPEG quality (0-100)',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryProperty',
		type: 'string',
		default: 'data',
		displayOptions: {
			show: {
				operation: ['screenshot'],
			},
		},
		description: 'Name of the binary property to store the screenshot in',
	},
];

// ============================================================
// Run Script fields
// ============================================================

export const scriptFields: INodeProperties[] = [
	{
		displayName: 'JavaScript Code',
		name: 'jsCode',
		type: 'string',
		typeOptions: { rows: 6 },
		required: true,
		default: '',
		placeholder: 'document.querySelectorAll(".item").length',
		displayOptions: {
			show: {
				operation: ['runScript'],
			},
		},
		description: 'JavaScript to evaluate in the page context. The return value is included in the output.',
	},
];
