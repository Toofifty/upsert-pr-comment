"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const getInputs = () => {
    const identifier = core.getInput("identifier");
    const insert = core.getInput("insert");
    const update = core.getInput("update");
    const updateTemplate = core.getInput("update-template") || "<!-- UPDATE_TEMPLATE -->";
    const prependNewline = Boolean(core.getInput("prepend-newline") !== "false");
    const removeRegex = core.getInput("remove-regex");
    const repoToken = core.getInput("repo-token") || process.env.GITHUB_TOKEN;
    const repoTokenUserLogin = core.getInput("repo-token-user-login");
    if (!repoToken) {
        throw new Error("No repo token specified, please set the GITHUB_TOKEN env variable");
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
const wrapId = (identifier) => `<!-- ${identifier} -->`;
const toRegex = (str) => {
    const main = str.match(/\/(.+)\/.*/)[1];
    const options = str.match(/\/.+\/(.*)/)[1];
    return new RegExp(main, options);
};
const findExistingComment = async (inputs, owner, repo, issue) => {
    const octokit = github.getOctokit(inputs.repoToken);
    const { data: comments } = await octokit.issues.listComments({
        owner,
        repo,
        issue_number: issue,
    });
    return comments.find((comment) => { var _a; return (_a = comment.body) === null || _a === void 0 ? void 0 : _a.includes(wrapId(inputs.identifier)); });
};
const updateComment = async (comment, inputs, owner, repo) => {
    var _a;
    const octokit = github.getOctokit(inputs.repoToken);
    const cleanedBody = inputs.removeRegex
        ? comment.body.replace(toRegex(inputs.removeRegex), "")
        : comment.body;
    const body = cleanedBody.includes(inputs.updateTemplate)
        ? cleanedBody.replace(inputs.updateTemplate, inputs.updateTemplate +
            (inputs.prependNewline ? "\n" : "") +
            inputs.update)
        : (_a = inputs.update) !== null && _a !== void 0 ? _a : inputs.insert;
    await octokit.issues.updateComment({
        owner,
        repo,
        comment_id: comment.id,
        body,
    });
};
const createComment = async (inputs, owner, repo, issue) => {
    const octokit = github.getOctokit(inputs.repoToken);
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
    const { payload: { pull_request: pullRequest, issue, repository }, } = github.context;
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
const run = async () => {
    try {
        await main();
    }
    catch (error) {
        core.setFailed(error.message);
    }
};
run();
exports.default = run;
