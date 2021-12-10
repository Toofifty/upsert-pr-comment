# Toofifty/upsert-pr-comment

Create & update PR comments via a Github action.

## Features

* Create new PR comments
* Update previously created PR comments
* Option to replace content or add new content via a text marker
* Option to remove text matching a regex before adding new content

## Usage

```yml
jobs:
  post-update-comment:
    runs-on: ubuntu-latest
    steps:
      - uses: Toofifty/upsert-pr-comment@v1
        with:
          identifier: some-custom-identifier
          insert: |
            Hello! Here's all the commits that have been made to this branch
            <!-- UPDATE_TEMPLATE -->
            * ${{ github.sha }} (latest)
          update: |
            * ${{ github.sha }} (latest)
          remove-regex: "/\\(latest\\)/gi"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Options

Name | Description | Required | Default
--|--|--|--
`identifier` | Unique identifier for the message. Can be literally anything unique | Yes |
`insert` | Initial message to print. Use `<!-- UPDATE_TEMPLATE -->` to designate where updated content will go | Yes |
`update` | Content to place into templated area on subsequent runs. If there is no template, it will replace the initial message | No |
`update-template` | Template marker for updates | No | `<!-- UPDATE_TEMPLATE -->`
`prepend-newline` | Whether to prepend a newline to the update content | No | true
`remove-regex` | Regex containing a text pattern to remove when updating a comment | No |
`repo-token` | A GitHub token for API access | Yes | `GITHUB_TOKEN` in env
