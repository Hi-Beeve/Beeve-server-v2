#!/bin/bash

set -e

# ===================================
# 자동으로 프로젝트 ID 감지
# ===================================
PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="beeve-api"
REGION="asia-northeast3"
REPOSITORY="beeve-api"

# Artifact Registry 경로
IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}"

echo "🚀 Deploying Beeve API"
echo "========================================"
echo "📦 Project: $PROJECT_ID"
echo "🏷️  Service: $SERVICE_NAME"
echo "🌏 Region: $REGION"
echo "📦 Image: $IMAGE_PATH"
echo ""

# 환경변수 로드
if [ -f .env ]; then
  echo "📄 Loading environment variables..."
  export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# ===================================
# 1. API 활성화
# ===================================
echo "🔌 Enabling required APIs..."
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com

# ===================================
# 2. 저장소 확인/생성
# ===================================
echo ""
echo "📦 Checking Artifact Registry repository..."

if ! gcloud artifacts repositories describe $REPOSITORY \
  --location=$REGION \
  --project=$PROJECT_ID 2>/dev/null; then
  echo "Creating new repository..."
  gcloud artifacts repositories create $REPOSITORY \
    --repository-format=docker \
    --location=$REGION \
    --project=$PROJECT_ID \
    --description="Beeve API Docker images"
  echo "✅ Repository created"
else
  echo "✅ Repository exists"
fi

# ===================================
# 3. 권한 설정
# ===================================
echo ""
echo "🔑 Setting up permissions..."

PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

echo "   Service Account: $SERVICE_ACCOUNT"

# 프로젝트 레벨 권한
for role in "roles/artifactregistry.writer" "roles/storage.admin"; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="$role" \
    --quiet > /dev/null 2>&1 || true
done

# 저장소 레벨 권한
gcloud artifacts repositories add-iam-policy-binding $REPOSITORY \
  --location=$REGION \
  --project=$PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/artifactregistry.writer" \
  --quiet > /dev/null 2>&1 || true

echo "✅ Permissions set"
echo "⏰ Waiting 10 seconds for propagation..."
sleep 10

# ===================================
# 4. Docker 이미지 빌드
# ===================================
echo ""
echo "🏗️  Building Docker image..."
gcloud builds submit --tag $IMAGE_PATH:latest --project=$PROJECT_ID

echo ""
echo "✅ Build complete!"

# ===================================
# 5. Cloud Run 배포
# ===================================
echo ""
echo "☁️  Deploying to Cloud Run..."

gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_PATH:latest \
  --platform managed \
  --region $REGION \
  --project=$PROJECT_ID \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --port 8080 \
  --min-instances 0 \
  --max-instances 10 \
  --set-secrets="\
DATABASE_URL=DATABASE_URL:latest,\
JWT_SECRET=JWT_SECRET:latest,\
GEMINI_API_KEY=GEMINI_API_KEY:latest,\
SUPABASE_SERVICE_KEY=SUPABASE_SERVICE_KEY:latest,\
UPSTASH_REDIS_REST_TOKEN=UPSTASH_REDIS_REST_TOKEN:latest" \
  --set-env-vars="\
NODE_ENV=production,\
PORT=8080,\
SUPABASE_URL=$SUPABASE_URL,\
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY,\
UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL,\
FRONTEND_URL=$FRONTEND_URL"

# ===================================
# 6. 완료
# ===================================
echo ""
echo "========================================"
echo "✅ Deployment complete!"
echo "========================================"

SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project=$PROJECT_ID \
  --format="value(status.url)")

echo ""
echo "🌐 Service URL:"
echo "   $SERVICE_URL"
echo ""
echo "🎉 Test:"
echo "   curl $SERVICE_URL/health"