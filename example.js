import { Octokit } from "octokit";
import { WebClient } from "@slack/web-api";
import config from "config";
import fetch from "node-fetch";

const githubToken = config.get("github.token");
const octokit = new Octokit({
  request: { fetch },
  auth: githubToken,
});

const owner = config.get("github.owner");
const targetRepos = config.get("github.repos");

const requestedPr = {};
for (const repo of targetRepos) {
  const prs = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
    owner,
    repo,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  const githubId = config.get("github.id");
  const requestedReviews = prs.data.filter(
    (pr) =>
      pr.state === "open" &&
      pr.draft === false &&
      !pr.title.toUpperCase().includes("WIP") &&
      pr.requested_reviewers.find((reviewer) => reviewer.id === githubId)
  );

  for (const review of requestedReviews) {
    const eachPr = {
      reviewee: review.user.login,
      link: `<${review.html_url}|${review.title}>`,
    };

    if (requestedPr[repo]) {
      requestedPr[repo].push(eachPr);
    } else {
      requestedPr[repo] = [eachPr];
    }
  }
}

const token = config.get("slack.botToken");
const web = new WebClient(token);

let convertedMessage = "";
for (const [repo, prs] of Object.entries(requestedPr)) {
  convertedMessage += `:rocket: *[${repo}]*\n`;
  prs.forEach(
    (pr) =>
      (convertedMessage += `\t- 요청자: ${pr.reviewee}, 리뷰: ${pr.link}\n`)
  );
}

await web.chat.postMessage({
  text:
    convertedMessage ||
    "남아있는 PR이 없어서 리뷰 비서는 행복해요 :smiling_face_with_3_hearts::star-struck::clap:",
  channel: "랜덤",
  icon_emoji:
    convertedMessage === "" ? "smiling_face_with_3_hearts" : "cubimal_chick",
  username: "리뷰 비서",
});
