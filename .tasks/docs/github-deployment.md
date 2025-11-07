# GitHub 연동 배포 설정 가이드

Trace: TASK-backlog-004

## 개요

Cloudflare Workers를 GitHub 저장소와 연결하여 자동 배포를 설정합니다.

## 배포 방식 옵션

### Option 1: Cloudflare Dashboard - GitHub 통합 (권장)

**장점:**
- 설정이 간단함
- Cloudflare UI에서 배포 히스토리 확인 가능
- 자동 프리뷰 환경 생성

**설정 방법:**

1. **Cloudflare Dashboard 접속**
   - https://dash.cloudflare.com
   - Workers & Pages 선택

2. **기존 Worker에 GitHub 연결**
   - cheongram-board Worker 선택
   - Settings > Deployments
   - "Connect to Git" 클릭

3. **GitHub 저장소 연결**
   - GitHub 계정 인증
   - 저장소 선택: `kadragon/cheongram-board`
   - 브랜치 선택: `main`

4. **빌드 설정**
   - Build command: `cd api && npm run build`
   - Build output directory: `api`
   - Root directory: `/`
   - Environment variables:
     - `NODE_ENV=production`

5. **배포 트리거**
   - Production branch: `main`
   - Preview branches: `develop`, `feature/*`

---

### Option 2: GitHub Actions (더 많은 제어)

**장점:**
- 완전한 CI/CD 파이프라인 제어
- 복잡한 워크플로우 구성 가능
- 테스트, 린트, 타입체크 자동화

**설정 방법:**

#### 1. GitHub Secrets 설정

Repository Settings > Secrets and variables > Actions에서 추가:

```
CLOUDFLARE_API_TOKEN=<your-api-token>
CLOUDFLARE_ACCOUNT_ID=6ed03d41ee9287a3e0e5bde9a6772812
```

**API Token 생성 방법:**
1. https://dash.cloudflare.com/profile/api-tokens
2. "Create Token" 클릭
3. "Edit Cloudflare Workers" 템플릿 사용
4. Account Resources: `Include` > `Your Account`
5. Zone Resources: `Include` > `All zones`
6. 토큰 생성 후 복사

#### 2. GitHub Actions Workflow 파일 생성

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main

env:
  NODE_VERSION: '18'

jobs:
  test:
    name: Test & Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type check (API)
        run: cd api && npm run typecheck

      - name: Type check (Web)
        run: cd web && npm run typecheck

      - name: Build
        run: cd api && npm run build

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://cheongram-board-worker-staging.kangdongouk.workers.dev
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Deploy to Staging
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy --env staging
          workingDirectory: api

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://crb.kadragon.work
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Deploy to Production
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
          workingDirectory: api
```

---

## 배포 후 확인 사항

### 자동 배포 테스트

1. **코드 변경 후 Push**
   ```bash
   git add .
   git commit -m "test: Verify automated deployment"
   git push origin main
   ```

2. **배포 확인**
   - GitHub Actions: Repository > Actions 탭
   - Cloudflare Dashboard: Workers & Pages > cheongram-board > Deployments

3. **Production 검증**
   ```bash
   curl https://crb.kadragon.work/api
   curl https://cheongram-board.kangdongouk.workers.dev/api
   ```

---

## 환경 변수 및 시크릿 관리

### Production Secrets 설정

**Cloudflare Dashboard 방식:**
```bash
wrangler secret put ADMIN_EMAILS
# 입력: kangdongouk@gmail.com
```

**GitHub Actions 방식:**
- Secrets는 GitHub에 저장
- Wrangler Action이 자동으로 Cloudflare에 동기화

---

## Custom Domain 설정

### 1. wrangler.toml 설정 (이미 완료)

```toml
routes = [
  { pattern = "crb.kadragon.work", custom_domain = true }
]
```

### 2. DNS 설정

1. Cloudflare Dashboard > kadragon.work 도메인
2. DNS > Records > Add record:
   - Type: `CNAME`
   - Name: `crb`
   - Target: `cheongram-board.kangdongouk.workers.dev`
   - Proxy status: Proxied (🟠)

### 3. 배포 시 자동 적용

다음 배포 시 custom domain이 자동으로 활성화됩니다.

---

## Cloudflare Access 설정 (선택사항)

### Admin 경로 보호

1. Zero Trust Dashboard: https://one.dash.cloudflare.com
2. Access > Applications > Add application
3. 설정:
   - Name: Cheongram Board Admin
   - Domain: `crb.kadragon.work`
   - Path: `/admin/*`
4. Access Policy:
   - Rule: Email - `kangdongouk@gmail.com`
   - Action: Allow

---

## 모니터링 설정

### 1. Cloudflare Analytics

- Dashboard > Workers & Pages > cheongram-board > Analytics
- 기본 메트릭 자동 수집:
  - 요청 수
  - 에러율
  - CPU 사용 시간
  - 대역폭

### 2. Logpush (선택사항)

```bash
wrangler tail --env production
```

실시간 로그 모니터링

---

## 롤백 절차

### GitHub Actions 사용 시

1. **이전 커밋으로 롤백**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **특정 버전으로 롤백**
   - GitHub Actions > 이전 성공한 워크플로우 선택
   - "Re-run all jobs" 클릭

### Cloudflare Dashboard 사용 시

1. Workers & Pages > cheongram-board > Deployments
2. 이전 버전 선택
3. "Rollback to this deployment" 클릭

---

## 다음 단계

- [ ] GitHub 저장소 생성 및 코드 푸시
- [ ] GitHub Secrets 설정 (Option 2 선택 시)
- [ ] Cloudflare GitHub 연동 또는 GitHub Actions 설정
- [ ] Custom domain DNS 설정
- [ ] Cloudflare Access 설정 (선택사항)
- [ ] 첫 자동 배포 테스트
- [ ] Production 검증

---

## 현재 상태

✅ Production Worker 배포 완료
- URL: https://cheongram-board.kangdongouk.workers.dev
- Database: cheongram-board-db (schema applied)
- Status: Healthy

⏳ 대기 중:
- GitHub 연동 설정
- Custom domain 활성화
- Cloudflare Access 설정

---

**Trace**: TASK-backlog-004, SPEC-migration-supabase-to-cloudflare-1
**작성일**: 2025-11-07
