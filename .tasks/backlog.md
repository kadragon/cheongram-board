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

> Traceability Reminder: Add concrete SPEC-ID/TEST-ID once 정의 완료 시 갱신
