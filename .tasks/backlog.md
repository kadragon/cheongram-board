# Backlog

- Trace: SPEC-TBD, TEST-TBD
  Unclear Field: performanceMonitor.measureAsync database 호출 구조
  Proposed Clarification: Supabase 쿼리가 실제 실행되도록 measureAsync 내부/외부 어디에서 `await` 수행할지 결정 필요
  Owner: TBD
  Status: in-progress

- Trace: SPEC-TBD, TEST-TBD
  Unclear Field: 감사/로깅 헬퍼 사용자 식별자 전달 방식
  Proposed Clarification: API 라우트에서 인증 사용자 정보를 어떤 계층에서 가져와 auditLogger/dataEventLogger에 주입할지 정의 필요
  Owner: TBD
  Status: open

- Trace: SPEC-TBD, TEST-TBD
  Unclear Field: AGENTS.md에 규정된 `.spec`/`.agents` 전환 계획
  Proposed Clarification: 현 `.kiro` 기반 문서를 공식 SDD × TDD 구조로 이전하는 절차와 책임자 지정 필요
  Owner: TBD
  Status: open

- Trace: SPEC-migration-supabase-to-cloudflare-1
  Unclear Field: Supabase 데이터 마이그레이션 시점
  Proposed Clarification: 마이그레이션 중 새로운 데이터가 추가될 경우 동기화 전략 필요 (parallel run 기간 동안)
  Owner: migration-team
  Status: resolved
  Resolution: 병렬 실행 안함. Cloudflare에서 처음부터 새로 시작. 데이터 마이그레이션 불필요.

- Trace: SPEC-migration-supabase-to-cloudflare-1
  Unclear Field: 기존 Supabase 구독 해지 시점
  Proposed Clarification: D1 전환 후 Supabase를 언제까지 유지할지 결정 필요 (30일? 60일?)
  Owner: migration-team
  Status: resolved
  Resolution: 0일. 즉시 전환.

- Trace: SPEC-migration-supabase-to-cloudflare-1
  Unclear Field: 프로덕션 마이그레이션 중 downtime 허용 여부
  Proposed Clarification: zero-downtime 필수인지, 짧은 점검 시간 허용 가능한지 확인 필요
  Owner: migration-team
  Status: resolved
  Resolution: 새로 시작하므로 downtime 무관. 기존 데이터 없음.

> Traceability Reminder: Add concrete SPEC-ID/TEST-ID once 정의 완료 시 갱신
