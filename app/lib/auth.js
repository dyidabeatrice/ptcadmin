import jwt from 'jsonwebtoken'

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is required')
  return secret
}

export function signToken(payload, expiresIn = '365d') {
  return jwt.sign(payload, getSecret(), { expiresIn })
}

export function verifyToken(token) {
  return jwt.verify(token, getSecret())
}