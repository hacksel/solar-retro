#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Solar Retro AWS Frontend Deployment Script ===${NC}\n"

# Check prerequisites
echo "Checking prerequisites..."
command -v terraform >/dev/null 2>&1 || { echo -e "${RED}Error: terraform is not installed${NC}" >&2; exit 1; }
command -v aws >/dev/null 2>&1 || { echo -e "${RED}Error: aws CLI is not installed${NC}" >&2; exit 1; }
echo -e "${GREEN}✓ All prerequisites met${NC}\n"

# Get AWS config
AWS_REGION=${AWS_REGION:-eu-west-1}
APP_NAME="solar-retro"

echo "AWS Region: $AWS_REGION"
echo ""

# Step 1: Initialize Terraform
echo -e "${BLUE}Step 1: Initializing Terraform...${NC}"
cd terraform
terraform init
echo -e "${GREEN}✓ Terraform initialized${NC}\n"

# Step 2: Deploy infrastructure (S3 + CloudFront)
echo -e "${BLUE}Step 2: Deploying frontend infrastructure...${NC}"
terraform apply -auto-approve

CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
FRONTEND_BUCKET=$(terraform output -raw frontend_bucket_name)
CLOUDFRONT_ID=$(terraform output -raw cloudfront_distribution_id)

echo -e "${GREEN}✓ Infrastructure deployed${NC}\n"

# Step 3: Build and deploy frontend
echo -e "${BLUE}Step 3: Building and deploying frontend...${NC}"
cd ../frontend

# Build frontend (Assumes manual configuration in App.tsx as per user's latest changes)
npm run build

# Deploy to S3
aws s3 sync dist/ s3://$FRONTEND_BUCKET --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"

echo -e "${GREEN}✓ Frontend deployed${NC}\n"

# Summary
echo -e "${BLUE}=====================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo "Frontend URL: $CLOUDFRONT_URL"
echo ""
echo -e "${BLUE}Note: CloudFront distribution may take 10-15 minutes to fully propagate.${NC}"
echo ""
