"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = __importDefault(require("@actions/core"));
const github_1 = __importDefault(require("@actions/github"));
const getInputs = () => {
    var _a, _b;
    const identifier = core_1.default.getInput("identifier");
    const insert = core_1.default.getInput("insert");
    const update = core_1.default.getInput("update");
    const updateTemplate = (_a = core_1.default.getInput("update-template")) !== null && _a !== void 0 ? _a : "<!-- UPDATE_TEMPLATE -->";
    const repoToken = (_b = core_1.default.getInput("repo-token")) !== null && _b !== void 0 ? _b : process.env.GITHUB_TOKEN;
    const repoTokenUserLogin = core_1.default.getInput("repo-token-user-login");
    if (!insert && !update) {
        throw new Error("No insert or update specified. Nothing to do");
    }
    if (!repoToken) {
        throw new Error("No repo token specified, please set the GITHUB_TOKEN env variable");
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
const wrapId = (identifier) => `<!-- ${identifier} -->`;
const findExistingComment = async (inputs, owner, repo, issue) => {
    const octokit = github_1.default.getOctokit(inputs.repoToken);
    const { data: comments } = await octokit.issues.listComments({
        owner,
        repo,
        issue_number: issue,
    });
    return comments.find((comment) => { var _a; return (_a = comment.body) === null || _a === void 0 ? void 0 : _a.includes(wrapId(inputs.identifier)); });
};
const updateComment = async (comment, inputs, owner, repo) => {
    const octokit = github_1.default.getOctokit(inputs.repoToken);
    const body = comment.body.includes(inputs.updateTemplate)
        ? comment.body.replace(inputs.updateTemplate, `${inputs.updateTemplate}${inputs.update}`)
        : `${comment.body}\n${inputs.update}`;
    await octokit.issues.updateComment({
        owner,
        repo,
        comment_id: comment.id,
        body,
    });
};
const createComment = async (inputs, owner, repo, issue) => {
    const octokit = github_1.default.getOctokit(inputs.repoToken);
    await octokit.issues.createComment({
        owner,
        repo,
        issue_number: issue,
        body: `${wrapId(inputs.identifier)}${inputs.insert}`,
    });
};
const main = async () => {
    var _a;
    const inputs = getInputs();
    const { payload: { pull_request: pullRequest, issue, repository }, } = github_1.default.context;
    const [owner, repo] = repository.full_name.split("/");
    if (!issue && !pullRequest) {
        throw new Error("Not a pull request. Nothing to do");
    }
    const issueNumber = ((_a = issue === null || issue === void 0 ? void 0 : issue.number) !== null && _a !== void 0 ? _a : pullRequest === null || pullRequest === void 0 ? void 0 : pullRequest.number);
    const message = await findExistingComment(inputs, owner, repo, issueNumber);
    if (message) {
        await updateComment(message, inputs, owner, repo);
    }
    else {
        await createComment(inputs, owner, repo, issueNumber);
    }
};
exports.default = async () => {
    try {
        await main();
    }
    catch (error) {
        core_1.default.setFailed(error.message);
    }
};
