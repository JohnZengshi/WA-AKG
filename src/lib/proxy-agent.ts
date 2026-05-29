import type { Agent } from 'https'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { URL } from 'url'
import { logger } from './logger'

interface ProxyConfig {
    proxyUrl?: string | null
    sessionId?: string
}

async function buildAgent(proxyUrl: string): Promise<Agent> {
    const parsed = new URL(proxyUrl)

    if (parsed.protocol === 'socks5:' || parsed.protocol === 'socks5h:') {
        try {
            const { SocksProxyAgent } = await import('socks-proxy-agent')
            return new SocksProxyAgent(proxyUrl) as unknown as Agent
        } catch {
            logger.warn('Proxy', 'socks-proxy-agent not installed, falling back to HTTPS proxy. Install with: npm install socks-proxy-agent')
            return new HttpsProxyAgent(proxyUrl) as unknown as Agent
        }
    }

    return new HttpsProxyAgent(proxyUrl) as unknown as Agent
}

export async function createProxyAgent(config?: ProxyConfig): Promise<{
    agent?: Agent
    fetchAgent?: Agent
}> {
    const proxyUrl =
        config?.proxyUrl ||
        process.env.HTTPS_PROXY ||
        process.env.HTTP_PROXY ||
        process.env.PROXY_URL ||
        process.env.https_proxy ||
        process.env.http_proxy

    if (!proxyUrl) return {}

    try {
        const agent = await buildAgent(proxyUrl)
        const sessionInfo = config?.sessionId ? `[${config.sessionId}] ` : ''
        logger.success('Proxy', `${sessionInfo}Connected via ${new URL(proxyUrl).protocol}//${new URL(proxyUrl).hostname}`)
        return { agent, fetchAgent: agent }
    } catch (e) {
        logger.error('Proxy', `Failed to create proxy agent for session ${config?.sessionId || 'unknown'}:`, e)
        return {}
    }
}
