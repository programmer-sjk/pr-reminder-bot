import { Octokit } from "octokit";
import config from "config";
import fetch from "node-fetch";

const githubToken = config.get("github.token");
const octokit = new Octokit({
  request: { fetch },
  auth: githubToken,
});

const owner = config.get("github.owner");
const targetRepos = config.get("github.repos");

const results = [];
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
      pr.requested_reviewers.find((reviewer) => reviewer.id === githubId)
  );

  for (const review of requestedReviews) {
    results.push({ repo, reviewee: review.user.login, name: review.title });
  }
}

console.log(results);
