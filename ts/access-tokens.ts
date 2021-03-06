import bcrypt from 'bcryptjs'

export interface AccessTokenManager {
    createToken(): Promise<{ plainTextToken: string, hashedToken: string }>
    validateToken(params: { providedToken: string, actualHash: string }): Promise<boolean>
}

export class DevelopmentAccessTokenManager implements AccessTokenManager {
    constructor(private options: { tokenGenerator: () => string }) {
    }

    async createToken(): Promise<{ plainTextToken: string, hashedToken: string }> {
        const token = this.options.tokenGenerator()
        return { plainTextToken: token, hashedToken: token }
    }

    async validateToken(params: { providedToken: string, actualHash: string }): Promise<boolean> {
        return params.providedToken === params.actualHash
    }
}

export class BcryptAccessTokenManager {
    constructor(private options: { tokenGenerator: () => Promise<string> }) {
    }

    async createToken(): Promise<{ plainTextToken: string, hashedToken: string }> {
        const token = await this.options.tokenGenerator()
        const hashedToken = await bcrypt.hash(token, 10)
        return { plainTextToken: token, hashedToken }
    }

    async validateToken(params: { providedToken: string, actualHash: string }): Promise<boolean> {
        return bcrypt.compare(params.providedToken, params.actualHash)
    }
}
