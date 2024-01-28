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

const pullRequests = await getPullRequests(octokit);
for (const pr of pullRequests) {
  const additionalReviewerIds = await getCommentOrRequestChangeReviewerIds(
    octokit,
    pr.repo,
    pr.pullNumber,
    pr.revieweeId
  );
  pr.reviewers = [...pr.reviewers, ...additionalReviewerIds];
}

let convertedMessage = '';
const convertedPullRequests = convertPullRequestsByRepository(pullRequests);
for (const [repo, prs] of Object.entries(convertedPullRequests)) {
  convertedMessage += `:rocket: *[${repo}]*\n`;
  prs.forEach(
    (pr) =>
      (convertedMessage += `\t- 요청자: ${pr.revieweeName}, 리뷰: ${pr.link}\n`)
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

////////////////////////////// 함수 //////////////////////////////
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
 * https://docs.github.com/en/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-requests
 */
async function getPullRequests(octokit) {
  const pullRequests = [];
  for (const repo of targetRepos) {
    const prs = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
      owner,
      repo,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    });

    const validPrs = convertPullRequest(filterValidReview(prs));
    validPrs.forEach((pr) => pullRequests.push(pr));
  }

  return pullRequests;
}

/**
 * PR이 open 상태이고
 * PR이 draft가 아니며
 * PR에 할당된 리뷰어 목록에 내 githubId가 있다면 (나에게 리뷰가 할당되어 있다면)
 */
function filterValidReview(prs) {
  return prs.data.filter(
    (pr) =>
      pr.state === 'open' &&
      pr.draft === false &&
      pr.requested_reviewers.find((reviewer) => reviewer.id === myGithubId)
  );
}

/**
 * 하나의 PR 마다 포함하는 데이터가 많으므로 필요한 데이터만 추출
 * 여기서 응답 받는 reviewers는 Approve, Comment, Request Change를 하지 않은 사용자
 */
function convertPullRequest(prs) {
  return prs.map((pr) => ({
    pullNumber: pr.number,
    repo: pr.base.repo.name,
    revieweeId: pr.user.id,
    revieweeName: pr.user.login,
    link: `<${pr.html_url}|${pr.title}>`,
    reviewers: pr.requested_reviewers.map((reviewer) => reviewer.id),
  }));
}

/**
 * https://docs.github.com/en/rest/pulls/reviews?apiVersion=2022-11-28#list-reviews-for-a-pull-request
 */
async function getCommentOrRequestChangeReviewerIds(
  octokit,
  repo,
  pullNumber,
  revieweeId
) {
  const reviews = await octokit.request(
    'GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews',
    {
      owner,
      repo,
      pull_number: pullNumber,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    }
  );

  const reviewerIds = reviews.data.map((review) => review.user.id);
  const excludeReviewerIds = reviews.data
    .filter(
      (review) => review.user.id === revieweeId || review.state === 'APPROVED'
    )
    .map((review) => review.user.id);

  const uniqueReviewerIds = [...new Set(reviewerIds)];
  const uniqueExcludeReviewerIds = [...new Set(excludeReviewerIds)];
  return uniqueReviewerIds.filter(
    (reviewerId) => !uniqueExcludeReviewerIds.includes(reviewerId)
  );
}

function convertPullRequestsByRepository(pullRequests) {
  const result = {};
  for (const pr of pullRequests) {
    const repo = pr.repo;
    if (result[repo]) {
      result[repo].push(pr);
    } else {
      result[repo] = [pr];
    }
  }

  return result;
}
