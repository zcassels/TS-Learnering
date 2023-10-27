#!/usr/bin/env node

import { Octokit } from '@octokit/rest';
import fs from 'fs';

const token = process.env['GH_TOKEN'];
const octokit = new Octokit({auth: token});

interface Blob {
    text: string
}

interface Release {
    name: string
}

interface LanguageNode {
    name: string
}
interface LanguageEdge {
    size: number
}

interface Lanuage {
    nodes: LanguageNode[]
    edges: LanguageEdge[]
}

interface Ref {
    target: Commit
}

interface StatusContext {
    state: string
    targetUrl: string
    createdAt: string
    context: string
}

interface CommitStatus {
    contexts: StatusContext[]
    state: string
}

interface Commit {
    status: CommitStatus
}

interface Repository {
    name: string
    isArchived: boolean
    languages?: Lanuage
    description: string
    pushedAt: string
    updatedAt: string
    createdAt: string
    defaultBranchRef: Ref
    latestRelease?: Release
    file?: Blob
}
interface PageInfo {
    hasNextPage: boolean
    endCursor: string
}
interface Repositories {
    pageInfo: PageInfo
    totalCount: number
    nodes: Repository[]
}
interface Organization {
    repositories: Repositories
}
interface OrgResult {
    organization: Organization
}


class PagedFetcher<T>
{
    query: string;
    org: string;

    constructor(query: string, org: string) {
        this.query = query
        this.org = org
    }
    
    async *next(): AsyncGenerator<T, any, T> {
        let maxPages = 1;
        let currentPage = 0;
        let cursor = null;
        const pageSize = 25;
    
        let successiveFailures = 0;
    
        while(true) {
            let curPage = currentPage;
            if (currentPage > maxPages) {
                console.log(`Reached page max ${curPage}, still more data`)
                break;
            }
    
            if (successiveFailures > 3) {
                console.error(`Too many failures, quiting ...`);
                break;
            }
            
            console.log(`Sending query for page ${curPage} size ${pageSize}`);
            let res;
            try {
                let params = {
                    'org': this.org,
                    'pageSize': pageSize,
                    'cursor': cursor
                }
                res = await octokit.graphql(this.query, params) as OrgResult;
            } catch(ex) {
                // sleep for 5 seconds in case of rate-limit
                await new Promise(res => setTimeout(res, 5*1000));
                console.error(`Error: ${ex.message}`);
                successiveFailures += 1;
                continue;
            }
            
            if (!res.organization) {
                throw new Error("Bad data");
            }

            let structured = res as OrgResult
    
            console.log(`Found repo data ${structured.organization.repositories.nodes.length} page ${currentPage*pageSize}/${structured.organization.repositories.totalCount}`);

            for (let repo of structured.organization.repositories.nodes) {
                yield repo as T;
            }
    
            if (!structured.organization.repositories.pageInfo.hasNextPage) {
                console.log(`Reached last page ${curPage}, no more data.`);
                break;
            }
    
            cursor = structured.organization.repositories.pageInfo.endCursor;
            currentPage += 1;
            successiveFailures = 0;
        }
    }
}

async function getMetadata(org) {
    const paged_query = `
    query GetRepos($org:String!, $pageSize:Int!, $cursor:String) {
      organization(login: $org) {
        repositories(first: $pageSize, after: $cursor) {
          pageInfo {
            hasNextPage,
            endCursor
          }
          totalCount
          nodes {
            name
            description
            isArchived
            pushedAt
            updatedAt
            createdAt
            defaultBranchRef {
                name
                target {
                    ... on Commit {
                        status {
                            contexts {
                              context
                              state
                              targetUrl
                              createdAt
                            }
                            state
                        }
                    }
                }
            }
            languages(first: 3) {
                nodes {
                    name
                }
            }
            latestRelease {
              name
            }
          }
        }
      }
    }
    `
    
    
    let fetcher = new PagedFetcher<Repository>(paged_query, org);
    
    for await (let repo of fetcher.next()) {
        fs.mkdirSync(`./.cache/${repo.name}/`, {recursive: true});

        const metadata = {
            org: org,
            name: repo.name,
            primary_lang: null,
            top_langs: null,
            release: null,
            pushedAt: repo.pushedAt,
            updatedAt: repo.updatedAt,
            createdAt: repo.createdAt,
            hasAnyStatus: false,
            overallStatus: null,
            ciStatus: null,
            ciCreated: null,
            ciUrl: null
        };

        if (repo.languages.nodes.length > 0 ) {
            metadata.primary_lang = repo.languages.nodes[0].name;
            metadata.top_langs =  repo.languages.nodes.map((n) => n.name).join(" ");
        }

        if (repo.latestRelease) {
            metadata.release = repo.latestRelease.name
        }

        if (repo?.defaultBranchRef?.target?.status?.contexts && repo.defaultBranchRef.target.status.contexts.length > 0) {
            metadata.hasAnyStatus = true;
            metadata.overallStatus = repo.defaultBranchRef.target.status.state;

            repo.defaultBranchRef.target.status.contexts
                .filter((c) => c.targetUrl && c.context === 'ci/circleci: build-linux')
                .forEach((c) => { 
                    metadata.ciStatus = c.state;
                    metadata.ciUrl = c.targetUrl;
                    metadata.ciCreated = c.createdAt;
                });
        }


        fs.writeFileSync(`./.cache/${repo.name}/metadata.json`, JSON.stringify(metadata, null, 4));
    }
}

async function getAllFiles(org, file) {
    const paged_query = `
    query GetRepos($org:String!, $pageSize:Int!, $cursor:String) {
      organization(login: $org) {
        repositories(first: $pageSize, after: $cursor) {
          pageInfo {
            hasNextPage,
            endCursor
          }
          totalCount
          nodes {
            name
            description
            latestRelease {
              name
            }
            file: object(expression: "HEAD:${file}") {
              ... on Blob {
                text
              }
            }
          }
        }
      }
    }
    `
    
    
    let fetcher = new PagedFetcher<Repository>(paged_query, org);
    
    for await (let repo of fetcher.next()) {
        if (repo.file) {
            fs.mkdirSync(`./.cache/${repo.name}/`, {recursive: true});
            fs.writeFileSync(`./.cache/${repo.name}/${file}`, repo.file.text);
        }
    }
}

let org = 'facebook'

await getMetadata(org);
// await getAllFiles(org, 'package.json');
// await getAllFiles(org, 'README.md');
// await getAllFiles(org, 'CODEOWNERS');