#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import fs from 'fs';

const token = process.env['GH_TOKEN'];
const octokit = new Octokit({auth: token});

// viewerQuery repo:%s state:open is:pr author:%s
// reviewerQuery repo:%s state:open review-requested:%s
const prStatusParams = {
    'prSearch': 'owner:zcassels state:open is:pr label:type:Example',
}

const query = fs.readFileSync('./graphql/pr_search.gql').toString();

// const res = await octokit.graphql(query, prStatusParams);

// const resJson = JSON.stringify(res, null, 4);
// fs.writeFileSync('./results/pr_search.json', resJson);
// console.log(resJson);

const prRes = await octokit.search.issuesAndPullRequests({q: 'owner:zcassels state:open is:pr label:type:Example'});

console.log('');
