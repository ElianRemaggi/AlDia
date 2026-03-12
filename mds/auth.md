# Feature: Authentication & Authorization

## Overview

JWT-based authentication with role-based access control. Two roles: `admin` and `commerce`.

## Roles

### Admin
- Can create and manage commerces
- Can create users for any commerce
- Can view cross-commerce data
- Cannot operate as a specific commerce (no supplier/product access)

### Commerce
- Bound to a single commerce (`commerce_id`)
- Full access to their own suppliers, products, lists, purchases
- Cannot see data from other commerces
- Cannot access admin routes

## Auth Flow

### Registration (Admin only)
1. Admin calls `POST /auth/register` with user data + target commerce_id
2. Password is hashed with bcrypt (salt rounds: 12)
3. User is created with specified role

### Login
1. User sends email + password to `POST /auth/login`
2. Server validates credentials
3. Returns:
   - `access_token` (JWT, 15 min expiry, in response body)
   - `refresh_token` (JWT, 7 days expiry, in httpOnly secure cookie)
4. Access token payload:
   ```json
   {
     "sub": "user_id",
     "role": "commerce",
     "commerce_id": "uuid",
     "iat": 1234567890,
     "exp": 1234568790
   }
   ```

### Token Refresh
1. Client sends `POST /auth/refresh` (cookie is sent automatically)
2. Server validates refresh token
3. Returns new access token
4. Optionally rotates refresh token

### Logout
1. Client sends `POST /auth/logout`
2. Server invalidates refresh token (blacklist or delete from DB)

## Middleware

### authMiddleware
- Extracts and validates JWT from Authorization header
- Attaches `req.user = { id, role, commerce_id }` to request
- Returns 401 if token is missing or invalid

### requireRole(role)
- Checks `req.user.role` against required role
- Returns 403 if role doesn't match

### scopeToCommerce
- For commerce users: enforces `commerce_id` filter on all queries
- Prevents cross-tenant data access
- Applied as middleware on all commerce routes

## Security Considerations

- Passwords: bcrypt, minimum 8 characters, no maximum (within reason)
- JWT secret: stored in environment variable, minimum 256 bits
- Refresh tokens: stored in DB table or Redis for revocation capability
- Rate limiting on login endpoint: 5 attempts per minute per IP
- CORS configuration: whitelist frontend domain only
- Helmet.js for security headers
- Input validation with zod or class-validator on all endpoints
