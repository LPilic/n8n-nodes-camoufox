import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CamoufoxApi implements ICredentialType {
	name = 'camoufoxApi';
	displayName = 'Camoufox Connection';
	documentationUrl = 'https://camoufox.com';

	properties: INodeProperties[] = [
		{
			displayName: 'WebSocket Endpoint',
			name: 'wsEndpoint',
			type: 'string',
			default: 'ws://localhost:3000',
			description: 'The Playwright WebSocket endpoint exposed by Camoufox (e.g. ws://host:port/playwright)',
			required: true,
		},
		{
			displayName: 'Ignore HTTPS Errors',
			name: 'ignoreHttpsErrors',
			type: 'boolean',
			default: false,
			description: 'Whether to ignore HTTPS certificate errors (e.g. self-signed or corporate proxy certificates)',
		},
		{
			displayName: 'Use Proxy',
			name: 'useProxy',
			type: 'boolean',
			default: false,
			description: 'Whether to route browser traffic through a proxy server',
		},
		{
			displayName: 'Proxy Server',
			name: 'proxyServer',
			type: 'string',
			default: '',
			placeholder: 'http://proxy.example.com:8080',
			description: 'Proxy URL including protocol and port (e.g. http://host:port, socks5://host:port)',
			required: true,
			displayOptions: {
				show: {
					useProxy: [true],
				},
			},
		},
		{
			displayName: 'Proxy Username',
			name: 'proxyUsername',
			type: 'string',
			default: '',
			description: 'Username for proxy authentication (leave empty if not required)',
			displayOptions: {
				show: {
					useProxy: [true],
				},
			},
		},
		{
			displayName: 'Proxy Password',
			name: 'proxyPassword',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Password for proxy authentication (leave empty if not required)',
			displayOptions: {
				show: {
					useProxy: [true],
				},
			},
		},
		{
			displayName: 'Proxy Bypass',
			name: 'proxyBypass',
			type: 'string',
			default: '',
			placeholder: 'localhost,127.0.0.1,.example.com',
			description: 'Comma-separated list of hosts to bypass the proxy for',
			displayOptions: {
				show: {
					useProxy: [true],
				},
			},
		},
	];
}
