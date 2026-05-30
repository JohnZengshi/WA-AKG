import { platform, release } from 'os'
import { prisma } from './prisma'
import { logger } from './logger'

export type BrowserFingerprint = [string, string, string]

interface FingerprintEntry {
    platform: string
    browser: string
    versions: string[]
}

const CHROME_VERSIONS = [
    '20.0.04', '22.0.05', '24.0.06', '26.0.08',
    '28.0.10', '30.0.12', '32.0.14', '34.0.16',
]

const FIREFOX_VERSIONS = [
    '44.0', '45.0', '46.0', '47.0', '48.0', '49.0', '50.0',
]

const EDGE_VERSIONS = [
    '20.0.01', '22.0.02', '24.0.03', '26.0.04', '28.0.05',
]

const BROWSER_POOL: FingerprintEntry[] = [
    { platform: 'Windows', browser: 'Chrome', versions: CHROME_VERSIONS },
    { platform: 'Windows', browser: 'Firefox', versions: FIREFOX_VERSIONS },
    { platform: 'Windows', browser: 'Edge', versions: EDGE_VERSIONS },
    { platform: 'Mac OS', browser: 'Chrome', versions: CHROME_VERSIONS },
    { platform: 'Mac OS', browser: 'Firefox', versions: FIREFOX_VERSIONS },
    { platform: 'Mac OS', browser: 'Safari', versions: ['14.0.3', '15.0.1', '16.0.2', '17.0.1'] },
    { platform: 'Ubuntu', browser: 'Chrome', versions: CHROME_VERSIONS },
    { platform: 'Ubuntu', browser: 'Firefox', versions: FIREFOX_VERSIONS },
]

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

export function randomizeBrowser(): BrowserFingerprint {
    const entry = pick(BROWSER_POOL)
    const version = pick(entry.versions)
    return [entry.platform, entry.browser, version]
}

export function getOsBasedBrowser(): BrowserFingerprint {
    const osPlatform = platform()
    let platformName = 'Ubuntu'
    let browserName = 'Chrome'

    if (osPlatform === 'win32') {
        platformName = 'Windows'
    } else if (osPlatform === 'darwin') {
        platformName = 'Mac OS'
        browserName = 'Safari'
    }

    const osRelease = release()
    const parts = osRelease.split('.').map(Number)
    const version = parts.length >= 2
        ? `${parts[0]}.${parts[1]}.${parts[2] || 0}`.padEnd(7, '0').substring(0, 7)
        : '20.0.04'

    return [platformName, browserName, version]
}

export function validateFingerprint(fp: unknown): fp is BrowserFingerprint {
    if (!Array.isArray(fp) || fp.length !== 3) return false
    return fp.every(v => typeof v === 'string')
}

export async function getOrCreateFingerprint(sessionId: string, isStopped?: () => boolean): Promise<BrowserFingerprint> {
    try {
        const session = await prisma.session.findUnique({
            where: { sessionId },
            select: { config: true }
        })

        if (isStopped?.()) return randomizeBrowser()

        const config = (session?.config as Record<string, any>) || {}
        if (config.browserFingerprint && validateFingerprint(config.browserFingerprint)) {
            logger.info('Fingerprint', `Session ${sessionId} using persisted fingerprint: ${config.browserFingerprint.join(', ')}`)
            return config.browserFingerprint
        }

        const fp = randomizeBrowser()
        
        if (isStopped?.()) return fp
        
        await prisma.session.update({
            where: { sessionId },
            data: { config: { ...config, browserFingerprint: fp } }
        })
        logger.success('Fingerprint', `Session ${sessionId} generated new fingerprint: ${fp.join(', ')}`)
        return fp
    } catch (e) {
        logger.warn('Fingerprint', `Failed to load/persist fingerprint for ${sessionId}, using random`, e)
        return randomizeBrowser()
    }
}

export async function saveFingerprint(sessionId: string, fingerprint: BrowserFingerprint): Promise<void> {
    try {
        const session = await prisma.session.findUnique({
            where: { sessionId },
            select: { config: true }
        })
        const config = (session?.config as Record<string, any>) || {}
        await prisma.session.update({
            where: { sessionId },
            data: { config: { ...config, browserFingerprint: fingerprint } }
        })
        logger.success('Fingerprint', `Session ${sessionId} fingerprint saved: ${fingerprint.join(', ')}`)
    } catch (e) {
        logger.error('Fingerprint', `Failed to save fingerprint for ${sessionId}`, e)
    }
}

export function buildBrowserDescription(fingerprint: BrowserFingerprint): BrowserFingerprint {
    return fingerprint
}
