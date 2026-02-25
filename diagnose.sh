#!/bin/bash

echo "🔍 Diagnosing the issue..."
echo "========================================"

# 1. 현재 프로젝트 정보
echo ""
echo "1️⃣ Current project configuration:"
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

echo "   Project ID: $PROJECT_ID"
echo "   Project Number: $PROJECT_NUMBER"

# 2. Artifact Registry 저장소 확인
echo ""
echo "2️⃣ Checking Artifact Registry repositories:"
gcloud artifacts repositories list --project=$PROJECT_ID

# 3. 저장소 생성 (없으면)
echo ""
echo "3️⃣ Creating repository if not exists..."
if ! gcloud artifacts repositories describe beeve-api \
  --location=asia-northeast3 \
  --project=$PROJECT_ID 2>/dev/null; then
  echo "   Creating repository..."
  gcloud artifacts repositories create beeve-api \
    --repository-format=docker \
    --location=asia-northeast3 \
    --project=$PROJECT_ID
else
  echo "   ✅ Repository exists"
fi

# 4. Cloud Build 서비스 계정
echo ""
echo "4️⃣ Cloud Build service account:"
SERVICE_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
echo "   $SERVICE_ACCOUNT"

# 5. 권한 부여
echo ""
echo "5️⃣ Granting permissions..."

# 프로젝트 레벨
echo "   Project-level permissions:"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/artifactregistry.writer" \
  --quiet

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/storage.admin" \
  --quiet

# 저장소 레벨
echo "   Repository-level permissions:"
gcloud artifacts repositories add-iam-policy-binding beeve-api \
  --location=asia-northeast3 \
  --project=$PROJECT_ID \
  --member="serviceAccount:$SERVICE_ACCOUNT" \
  --role="roles/artifactregistry.writer" \
  --quiet

# 6. 권한 확인
echo ""
echo "6️⃣ Verifying permissions..."
gcloud artifacts repositories get-iam-policy beeve-api \
  --location=asia-northeast3 \
  --project=$PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$SERVICE_ACCOUNT"

echo ""
echo "========================================"
echo "✅ Diagnosis complete!"
echo ""
echo "Correct image path should be:"
echo "   asia-northeast3-docker.pkg.dev/$PROJECT_ID/beeve-api/beeve-api:latest"
echo ""
echo "Waiting 30 seconds for permissions to propagate..."
sleep 30

echo ""
echo "Ready to build! Run:"
echo "   gcloud builds submit --tag asia-northeast3-docker.pkg.dev/$PROJECT_ID/beeve-api/beeve-api:latest"