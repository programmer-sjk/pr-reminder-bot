import { Octokit } from 'octokit';
import { WebClient } from '@slack/web-api';
import config from 'config';
import fetch from 'node-fetch';

const { githubToken, owner, targetRepos, myGithubId, slackToken } =
  initializeConfig();

const octokit = new Octokit({
  request: { fetch },
  auth: githubToken,
});

const requestedPr = {};
for (const repo of targetRepos) {
  // repo에 해당하는 PR 목록을 읽어온다.
  const prs = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
    owner,
    repo,
    headers: { 'X-GitHub-Api-Version': '2022-11-28' },
  });

  const requestedReviews = filterValidReview(prs);

  // 나에게 할당 된 리뷰 중 Slack 메시지를 위해 필요한 데이터만 추출한다.
  for (const review of requestedReviews) {
    const eachReview = {
      reviewee: review.user.login,
      link: `<${review.html_url}|${review.title}>`,
    };

    if (requestedPr[repo]) {
      requestedPr[repo].push(eachReview);
    } else {
      requestedPr[repo] = [eachReview];
    }
  }
}

let convertedMessage = '';
for (const [repo, prs] of Object.entries(requestedPr)) {
  convertedMessage += `:rocket: *[${repo}]*\n`;
  prs.forEach(
    (pr) =>
      (convertedMessage += `\t- 요청자: ${pr.reviewee}, 리뷰: ${pr.link}\n`)
  );
}

const web = new WebClient(slackToken);
await web.chat.postMessage({
  text:
    convertedMessage ||
    '남아있는 PR이 없어서 리뷰 비서는 행복해요 :smiling_face_with_3_hearts::star-struck::clap:',
  channel: '랜덤',
  icon_emoji:
    convertedMessage === '' ? 'smiling_face_with_3_hearts' : 'cubimal_chick',
  username: '리뷰 비서',
});

function initializeConfig() {
  return {
    githubToken: config.get('github.token'),
    owner: config.get('github.owner'),
    targetRepos: config.get('github.repos'),
    myGithubId: config.get('github.id'),
    slackToken: config.get('slack.botToken'),
  };
}

/**
 * PR이 open 상태이고
 * PR이 draft가 아니며
 * PR 제목에 WIP가 안 붙어 있고 (내가 속한 개발팀 규칙으로 수정중이라 리뷰할 필요가 없는 PR은 제목에 WIP를 붙임)
 * PR에 할당된 리뷰어 목록에 내 githubId가 있다면 (나에게 리뷰가 할당되어 있다면)
 */
function filterValidReview(prs) {
  return prs.data.filter(
    (pr) =>
      pr.state === 'open' &&
      pr.draft === false &&
      !pr.title.toUpperCase().includes('WIP') &&
      pr.requested_reviewers.find((reviewer) => reviewer.id === myGithubId)
  );
}
