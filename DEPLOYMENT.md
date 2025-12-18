# AWS Frontend Deployment Guide

## Prerequisites

Before deploying to AWS, ensure you have:

1. **AWS CLI** configured with appropriate credentials
   ```bash
   aws configure
   ```

2. **Terraform** installed (>= 1.0)
   ```bash
   terraform -version
   ```

3. **Node.js and npm** for building the frontend
   ```bash
   node --version
   npm --version
   ```

## Quick Deploy

The easiest way to deploy is using the provided deployment script:

```bash
./deploy.sh
```

This script will:
1. Initialize Terraform
2. Deploy frontend infrastructure (S3 + CloudFront)
3. Build the React frontend
4. Deploy the frontend to S3 and invalidate the CloudFront cache

**Estimated time**: 10-15 minutes

## Manual Deployment

### Step 1: Initialize Terraform

```bash
cd terraform
terraform init
```

### Step 2: Deploy Infrastructure

```bash
terraform apply
```

Review the plan and type `yes` to confirm.

### Step 3: Build and Deploy Frontend

```bash
cd ../frontend

# Build
npm run build

# Get bucket name
BUCKET_NAME=$(terraform -chdir=../terraform output -raw frontend_bucket_name)

# Upload to S3
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Invalidate CloudFront cache
DIST_ID=$(terraform -chdir=../terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

## Accessing Your Application

After deployment, get the URL:

```bash
cd terraform
terraform output cloudfront_url    # Frontend URL
```

Visit the CloudFront URL to access your application.

**Note**: CloudFront may take 10-15 minutes to fully propagate.

## Configuration

Ensure your `frontend/src/App.tsx` points to your external backend IP:

```tsx
// Example in App.tsx
fetch('http://88.185.224.80:32768/api/tree')
// and
const socket = new WebSocket('ws://88.185.224.80:32768/ws?...')
```

## Cost Management

### Tear Down Everything

```bash
cd terraform
terraform destroy
```

## Estimated Monthly Costs

- **S3**: < $1
- **CloudFront**: $0-5 (mostly free tier)
- **Total**: < $5/month
