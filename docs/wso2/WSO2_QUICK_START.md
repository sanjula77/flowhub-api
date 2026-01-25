# WSO2 API Manager - Quick Start Guide

Quick configuration steps for WSO2 API Manager.

## Prerequisites

- Docker containers running:
  - `flowhub-wso2-1` (WSO2 API Manager)
  - `flowhub-backend-1` (NestJS Backend)

---

## Quick Configuration Steps

### 1. Access WSO2 Publisher

```
URL: https://localhost:9443/publisher
Username: admin
Password: admin
```

### 2. Create API

1. Click **"Create API"** → **"Design a New REST API"**
2. Fill in:
   - **Name:** `FlowHub API`
   - **Context:** `/flowhub`
   - **Version:** `1.0.0`
   - **Endpoint:** `http://flowhub-backend-1:3001`
3. Click **"Create"**

### 3. Add Resources

Go to **"Resources"** tab, add:

**Users:**
- `GET /users/me`
- `GET /users`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`

**Teams:**
- `GET /teams/me`
- `GET /teams`
- `POST /teams`
- `PUT /teams/:id`
- `DELETE /teams/:id`

### 4. Enable Security

Go to **"Security"** tab:
- Select **"OAuth 2.0"**
- Enable all grant types

### 5. Enable JWT Forwarding

Go to **"Runtime Configuration"** tab:
- Enable **"JWT Assertion Forwarding"**
- Forward user claims

### 6. Configure Rate Limiting

Go to **"Runtime Configuration"** → **"Throttle Policies"**:
- Application: `1000 requests/minute`
- Resource: `500 requests/minute` (for admin endpoints)

### 7. Enable Analytics

Go to **"Runtime Configuration"** tab:
- Enable **"Analytics"**

### 8. Configure CORS

Go to **"Runtime Configuration"** → **"CORS"**:
- Enable CORS
- Origins: `http://localhost:3000`, `https://localhost:9443`
- Credentials: Enabled

### 9. Publish API

Go to **"Lifecycle"** tab:
- Click **"Publish"**

### 10. Create Application

1. Go to Developer Portal: `https://localhost:9443/devportal`
2. **"Applications"** → **"Create New Application"**
3. Name: `FlowHub App`
4. Click **"Create"**

### 11. Subscribe to API

1. Go to **"APIs"**
2. Find **"FlowHub API"**
3. Click **"Subscribe"**
4. Select your application
5. Click **"Subscribe"**

### 12. Generate Token

1. Go to **"Applications"** → Your app
2. **"Production Keys"** tab
3. Click **"Generate Keys"**
4. Copy **Access Token**

### 13. Test API

```bash
curl -X GET "https://localhost:8243/flowhub/1.0.0/users/me" \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
```

---

## Configuration Checklist

- [ ] API created
- [ ] Resources added
- [ ] OAuth 2.0 enabled
- [ ] JWT forwarding enabled
- [ ] Rate limiting configured
- [ ] Analytics enabled
- [ ] CORS configured
- [ ] API published
- [ ] Application created
- [ ] API subscribed
- [ ] Token generated
- [ ] API tested

---

## Common Issues

### Issue: Cannot connect to backend
**Solution:** Check backend is running: `docker ps | grep flowhub-backend-1`

### Issue: Invalid credentials
**Solution:** Use WSO2 OAuth token, not backend JWT

### Issue: CORS error
**Solution:** Configure CORS in Runtime Configuration

---

## Summary

**Quick Setup:**
1. Create API in Publisher
2. Add resources
3. Enable OAuth 2.0
4. Enable JWT forwarding
5. Configure rate limiting
6. Enable analytics
7. Publish API
8. Create application
9. Generate token
10. Test API

Your API is now protected by WSO2 with OAuth 2.0, JWT forwarding, rate limiting, and analytics!
