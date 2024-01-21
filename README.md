# 코드 리뷰 리마인더 봇

## 배경

- 회사 코드가 MSA로 **여러 Repository에서 관리**되는 환경에 있다.
- 리뷰를 한 적이 없는 PR이라면 [review-requested](https://github.com/pulls/review-requested) 페이지에서 확인이 가능하지만 comment를 달았던 PR은 이 페이지에서 확인되지 않는다.
- 매일 출근해서 리뷰를 하는데 두 단계로 나뉘어진다.
  - [review-requested](https://github.com/pulls/review-requested) 페이지에서 나에게 요청은 왔으나 리뷰를 한 적 없는 PR을 리뷰한다.
  - github 각 Repository에서 pulls 페이지를 들어가 comment를 단 적이 있는 PR을 찾아 리뷰한다.
- 매일 하는 리뷰인데 이 **과정들이 너무 귀찮아서** **`매일 아침 리뷰 목록을 알려주는 봇을 만들기로`** 결심했다.

## 요구사항

- MSA로 분리된 여러 Repository 정보에 접근할 수 있어야 한다.
- 내가 리뷰어로 할당 된 PR 중 **`승인한 PR을 제외한 모든 PR 목록을`** 얻어와야 한다.
- PR Label에 접근하여 Label을 수정할 수 있어야 한다.
  - 최대 언제까지 리뷰를 해달라는 `D-0`, `D-1`, `D-2`, `D-3` Label을 생성
  - 하루가 지나면 자동으로 `D-3 -> D-2 -> D-1 -> D-0` 으로 업데이트 하는 기능을 고민 중
- 리뷰를 도와주는 util 기능이기 때문에 안정성이나 성능이 최우선 고려 사항은 아니다.
- 어떤 회사를 가더라도 **`설정 값(Github 인증 값, Slack 관련)만`** 변경하면 동작해야 한다.

## 사용할 기술 선정

- 찾아보니 [PyGithub](https://github.com/PyGithub/PyGithub)가 제일 유명하고 사용하기 편해보였다.
  - Python으로 뚝딱뚝딱 만들 수 있겠다고 생각했지만, 사내 기술 스택은 JS이고 Python을 사용해 본 적 없는 분들도 있음
  - 내가 아니어도 편하게 유지보수가 가능하도록 JS 스택으로 개발하기로 결정
- 구글에서 **`js github api`** 키워드로 검색하며 아래 두 개의 라이브러리로 추렸다.
  - [Octokit](https://docs.github.com/en/rest/guides/scripting-with-the-rest-api-and-javascript?apiVersion=2022-11-28) ([github 주소](https://github.com/octokit/octokit.js))
  - [Github api](https://github.com/github-tools/github)
- Octokit은 Github REST API를 사용할 수 있는 SDK로 Github에 의해 관리된다.
- Github API는 Github REST API와 연동을 쉽게 해주는 라이브러리로 Node와 브라우저에서 사용이 가능하다.
  - Github API도 결국 내부적으로 REST API를 사용
- 둘 중 문서화가 좀 더 깔끔한 Octokit을 사용하기로 결정했다.
