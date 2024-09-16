#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import fs from 'fs';

const token = process.env['GH_TOKEN'];
const octokit = new Octokit({auth: token});

// viewerQuery repo:%s state:open is:pr author:%s
// reviewerQuery repo:%s state:open review-requested:%s
const prStatusParams = {
    'owner': 'facebook',
    'repo': 'react',
    'headRefName': 'main',
    'viewerQuery': 'repo:react state:open is:pr author:sebmarkbage',
    'reviewerQuery': 'repo:react state:open review-requested:sebmarkbage'
}

const query = fs.readFileSync('./graphql/pr_status.gql').toString();

const res = await octokit.graphql(query, prStatusParams);

const resJson = JSON.stringify(res, null, 4);
fs.writeFileSync('./results/pr_status.json', resJson);
console.log(resJson);
