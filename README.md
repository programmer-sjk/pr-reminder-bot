# 코드 리뷰 리마인더 봇

## 배경

- 회사 코드가 MSA로 **여러 Repository에서 관리**되는 환경에 있다.
- 매일 출근해서 리뷰를 하는데 두 단계로 나뉘어진다.
  - [review-requested](https://github.com/pulls/review-requested) 페이지에서 나에게 요청은 왔으나 리뷰를 한 적 없는 PR을 리뷰한다.
  - github 각 Repository에서 pulls 페이지를 들어가 comment를 단 적이 있는 PR을 찾아 리뷰한다.
- 매일 하는 리뷰인데 이 **과정들이 너무 귀찮아서** **`매일 아침 리뷰 목록을 알려주는 봇을 만들기로`** 결심했다.
- 예제로 제공되는 example.js 파일은 예제 코드일 뿐 각자의 업무 환경과 프레임워크에 맞게 적용시키면 된다.

## 요구사항

- MSA로 분리된 여러 Repository 정보에 접근할 수 있어야 한다.
- 내가 리뷰어로 할당 된 PR 중 **`open 상태이고 draft가 아니며 승인하지 않은 모든 PR 목록을`** 얻어와야 한다.
- 어떤 회사를 가더라도 **`설정 값(Github 인증 값, Slack 관련)만`** 변경하면 동작해야 한다.

## 사용하는 라이브러리

- Github에서 리뷰 목록 추출
  - JS 기반으로 구현하기 위해 [Octokit](https://docs.github.com/en/rest/guides/scripting-with-the-rest-api-and-javascript?apiVersion=2022-11-28)를 채택
- Slack 메시지 전송
  - 라이브러리는 목적에 충분한 `@slack/web-api` 모듈을 사용했다.
- 만약 Slack으로 토큰을 발급받고 설정하는 절차가 궁금하다면 [여기](https://github.com/programmer-sjk/TIL/blob/main/culture/review-reminder-bot.md#slack-%EB%A9%94%EC%8B%9C%EC%A7%80-%EC%A0%84%EC%86%A1)에서 자세한 절차를 확인할 수 있다.

## 실행 방법

- config/default.json 파일에 Github, Slack botToken에 적절한 값을 입력한다.
  - Github ID: Github 계정의 number ID로 `https://api.github.com/users/your_github_user_name` 접속하면 확인할 수 있다.
  - Github Token: <https://github.com/settings/tokens> 페이지에서 생성한 토큰
  - Github Repos: Review 목록을 요청받기 위한 Repository 배열. `ex) ['order-server', 'api-server']`
  - Slack BotToken: Slack으로 메시지를 보내기 위해 발급하는 토큰
- node example.js로 실행
  - repos에 입력한 Repository 중 나에게 할당된 PR 목록을 추출
  - 추출한 리뷰 목록을 Slack 메시지로 변환해 전송
