#!/usr/bin/env node

import { Octokit } from '@octokit/rest';

const token = process.env['GH_TOKEN'];
const octokit = new Octokit({auth: token});

// const authed = await res.users.getAuthenticated();

let hasNextPage = true;
let maxPages = 1;
let currentPage = 0;
let cursorQuery = '';
const pageSize = 100;

const foundRepositories = new Map<string, Repository>();

interface Blob {
    byteSize: number
}

interface Release {
    name: String
}

interface Repository {
    name: string
    description: string
    latestRelease?: Release
    packageJson?: Blob
    readme?: Blob
}
interface PageInfo {
    hasNextPage: boolean
    endCursor: string
}
interface Repositories {
    pageInfo: PageInfo
    nodes: Repository[]
}
interface Organization {
    repositories: Repositories
}
interface OrgResult {
    organization: Organization
}

while(hasNextPage) {
    let curPage = currentPage;
    if (currentPage++ > maxPages) {
        console.log(`Reached page max ${curPage}, still more data`)
        break;
    }

    const paged_query = `
    query GetRepos {
        organization(login: "facebook") {
          repositories(first: ${pageSize}${cursorQuery}) {
            pageInfo {
              hasNextPage,
              endCursor
            },
            nodes {
              name
              description
              latestRelease {
                name
              }
              packageJson: object(expression: "main:package.json") {
                ... on Blob {
                  byteSize
                }
              }
              readme: object(expression: "main:README.md") {
                ... on Blob {
                  byteSize
                }
              }
            }
          }
        }
      }
    `
    
    console.log(`Sending query for page ${curPage} size ${pageSize}`)
    const res = await octokit.graphql(paged_query)
    
    // const resJson = JSON.stringify(res, null, 4);
    // fs.writeFileSync('./results/paging_example.json', resJson);
    // console.log(resJson);

    if (res['organization']) {
        let structured = res as OrgResult

        structured.organization.repositories.nodes.forEach((rep) => {
            foundRepositories.set(rep.name, rep);
        });

        if (!structured.organization.repositories.pageInfo.hasNextPage) {
            console.log(`Reached last page ${curPage}, no more data.`);
            break;
        }

        cursorQuery = `, after: "${structured.organization.repositories.pageInfo.endCursor}"`;
    } else {
        console.error("error");
        break;
    }
}


console.log(`Found ${foundRepositories.size}`);

Array.from(foundRepositories)
.map((tuple) => tuple[1])
.filter((repo) => repo.readme)
.forEach((repo) => {
    console.log(`Found Repo ${repo.name} ${repo.readme.byteSize}`)
});


