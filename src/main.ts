import * as core from "@actions/core";
import * as github from "@actions/github";

const getInputs = () => {
  const identifier = core.getInput("identifier");
  const insert = core.getInput("insert");
  const update = core.getInput("update");
  const updateTemplate =
    core.getInput("update-template") || "<!-- UPDATE_TEMPLATE -->";
  const prependNewline = Boolean(core.getInput("prepend-newline") !== "false");
  const removeRegex = core.getInput("remove-regex");
  const repoToken = core.getInput("repo-token") || process.env.GITHUB_TOKEN;
  const repoTokenUserLogin = core.getInput("repo-token-user-login");

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
    prependNewline,
    removeRegex,
    repoToken,
    repoTokenUserLogin,
  };
};

const wrapId = (identifier: string) => `<!-- ${identifier} -->`;

const toRegex = (str: string) => {
  const main = str.match(/\/(.+)\/.*/)![1];
  const options = str.match(/\/.+\/(.*)/)![1];

  return new RegExp(main, options);
};

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

  const cleanedBody = inputs.removeRegex
    ? comment.body.replace(toRegex(inputs.removeRegex), "")
    : comment.body;

  const body = cleanedBody.includes(inputs.updateTemplate)
    ? cleanedBody.replace(
        inputs.updateTemplate,
        inputs.updateTemplate +
          (inputs.prependNewline ? "\n" : "") +
          inputs.update
      )
    : `${wrapId(inputs.identifier)}\n${inputs.update || inputs.insert}`;

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
    body: `${wrapId(inputs.identifier)}\n${inputs.insert}`,
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
