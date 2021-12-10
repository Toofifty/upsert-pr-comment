import * as core from "@actions/core";
import * as github from "@actions/github";

const getInputs = () => {
  const identifier = core.getInput("identifier");
  const insert = core.getInput("insert");
  const update = core.getInput("update");
  const updateTemplate =
    core.getInput("update-template") || "<!-- UPDATE_TEMPLATE -->";
  const repoToken = core.getInput("repo-token") || process.env.GITHUB_TOKEN;
  const repoTokenUserLogin = core.getInput("repo-token-user-login");

  if (!insert && !update) {
    throw new Error("No insert or update specified. Nothing to do");
  }

  if (!repoToken) {
    throw new Error(
      "No repo token specified, please set the GITHUB_TOKEN env variable"
    );
  }

  return {
    identifier,
    insert,
    update,
    updateTemplate,
    repoToken,
    repoTokenUserLogin,
  };
};

const wrapId = (identifier: string) => `<!-- ${identifier} -->`;

const findExistingComment = async (
  inputs: ReturnType<typeof getInputs>,
  owner: string,
  repo: string,
  issue: number
) => {
  const octokit = github.getOctokit(inputs.repoToken);
  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: issue,
  });

  return comments.find((comment) =>
    comment.body?.includes(wrapId(inputs.identifier))
  );
};

const updateComment = async (
  comment: any,
  inputs: ReturnType<typeof getInputs>,
  owner: string,
  repo: string
) => {
  const octokit = github.getOctokit(inputs.repoToken);

  const body = comment.body.includes(inputs.updateTemplate)
    ? comment.body.replace(
        inputs.updateTemplate,
        `${inputs.updateTemplate}${inputs.update}`
      )
    : `${comment.body}\n${inputs.update}`;

  await octokit.issues.updateComment({
    owner,
    repo,
    comment_id: comment.id,
    body,
  });
};

const createComment = async (
  inputs: ReturnType<typeof getInputs>,
  owner: string,
  repo: string,
  issue: number
) => {
  const octokit = github.getOctokit(inputs.repoToken);

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: issue,
    body: `${wrapId(inputs.identifier)}${inputs.insert}`,
  });
};

const main = async () => {
  const inputs = getInputs();

  const {
    payload: { pull_request: pullRequest, issue, repository },
  } = github.context;

  const [owner, repo] = repository!.full_name!.split("/");

  if (!issue && !pullRequest) {
    throw new Error("Not a pull request. Nothing to do");
  }

  const issueNumber = (issue?.number ?? pullRequest?.number)!;

  const message = await findExistingComment(inputs, owner, repo, issueNumber);

  if (message) {
    await updateComment(message, inputs, owner, repo);
  } else {
    await createComment(inputs, owner, repo, issueNumber);
  }
};

const run = async (): Promise<void> => {
  try {
    await main();
  } catch (error: any) {
    core.setFailed(error.message);
  }
};

run();

export default run;
