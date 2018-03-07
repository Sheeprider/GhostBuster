// Setup (automate inside Generate?), Generate, Preview, Deploy

// const fs = require('fs');
const fs = require('fs-extra')
const git = require('nodegit');
const opn = require('opn');
const path = require('path');
const readline = require('readline');
const scrape = require('website-scraper');
const url = require('url');

// TODO : generate long and random name to ensure it's never used
const fake = 'fake';

const getCreateCloneRepo = function(staticDir, repoUrl) {
    // Return repo
    console.log('Try to open repo');
    return git.Repository.open(path.resolve(staticDir, ".git"))
        .catch((err) => {
            // console.log(err);
            if (err.errno !== git.Error.CODE.ENOTFOUND) return Promise.reject(err);
            else {
                console.log('Repo does not exist, trying to clone');
                return git.Clone(
                        repoUrl,
                        staticDir, {
                            fetchOpts: {
                                callbacks: {
                                    credentials: credentials,
                                    certificateCheck: function() {
                                        // github will fail cert check on some OSX machines
                                        // this overrides that check
                                        return 1;
                                    }
                                }
                            }
                        })
                    .catch((err) => {
                        console.log('Cloning failed, making new');
                        return git.Repository.init(staticDir, is_bare = 0); // Create a .git subfolder
                    })
            }
        })
}

var _setup = (config, force) => {
    /*
        Delete ${dir/fake} if it exists
        HACK : This folder is not used in itself
        We just tell website-scraper to download all files to it
        And then save them inside ${dir} instead
        So ${dir} (and ${dir}/.git) doesn't need to get deleted

        TODO : also empty ${dir} (except .git) ? Only in case of pull ?
        Create .git if needed ? Won't work if remote git is not clean
        Create git branch if needed ?
    */
    const dir = path.resolve(config.BUSTER_DIR); // Work with absolute paths

    return getCreateCloneRepo(dir, config.REPO_URL)
        .then((repo) => {
            return addRemote(repo, 'buster', config.REPO_URL);
        })
        .then((rmt) => {
            // TODO : reword question ? rework function ?
            const fakeDir = path.join(dir, fake)
            if (force) return fs.remove(fakeDir);
            else {
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout
                });
                const basename = path.basename(dir);
                rl.question(`Do you want to DELETE all files and folders inside ${basename} ?\n> y/N: `, (answer) => {
                    rl.pause();
                    if (answer.match(/^y(es)?$/i)) {
                        return fs.remove(fakeDir);
                    }
                    rl.close();
                });
            }
        });
}
exports.setup = _setup;


exports.generate = function(config) {
    /*
    1. TODO : (Optional) Start Ghost web server
    2. Get index and all pages listed in sitemap and download them in ${staticDir}
    3. TODO : Get all RSS links from "https://feedly.com/i/subscription/feed/http://localhost:2368/rss/" links and download them
    4. TODO : (Optional, goes with 1.) Stop Ghost web server
    */
    // var rss = [
    //     // The rss link
    //     new url.URL('rss/', ghostUrl).href,
    // ];
    const options = {
        urls: [
            // Get the index
            new url.URL(config.GHOST_URL).href,
            // ... and all the sitemap files
            new url.URL('sitemap.xsl', config.GHOST_URL).href, // Contains links in javascript templates that may confuse website-scraper
            new url.URL('sitemap.xml', config.GHOST_URL).href,
            new url.URL('sitemap-pages.xml', config.GHOST_URL).href,
            new url.URL('sitemap-posts.xml', config.GHOST_URL).href,
            new url.URL('sitemap-authors.xml', config.GHOST_URL).href,
            new url.URL('sitemap-tags.xml', config.GHOST_URL).href,
        ],
        directory: path.join(config.BUSTER_DIR, fake),
        recursive: true,
        urlFilter: (url) => {
            // if (url.includes('/rss/') && rss.indexOf(url) === -1) rss.push(url); // get rss URLs after the fact?
            return url.startsWith(config.GHOST_URL);
        },
        filenameGenerator: (resource, options, occupiedFileNames) => {
            // [ 'url', 'filename', 'type', 'depth', 'parent', 'children', 'saved' ]
            var resUrl = new url.URL(resource.url).pathname;
            if (resUrl.endsWith('/')) resUrl = path.join(resUrl, 'index.html');
            // HACK : Save files inside ${dir} instead of ${dir}/fake
            return path.join('..', resUrl);
        },
        onResourceError: (resource, err) => {
            console.log(`Resource ${resource} was not saved because of ${err}`);
        },
        // onResourceSaved: (resource) => {
        //     console.log(`Resource ${resource} was saved.`);
        // },
        // 'filenameGenerator': 'bySiteStructure',
        // 'maxRecursiveDepth': 5,
        // 'defaultFilename': 'index.html',
        // 'prettifyUrls': false,
    };

    return scrape(options)
        .then((results) => {
            // console.log(options);
            // console.log(results);
        }).catch((err) => {
            console.log(err);
            return Promise.reject(err);
        })
}


exports.preview = function(config) {
    // 1. Open index/root in browser
    const staticDir = path.resolve(config.BUSTER_DIR); // Work with absolute paths
    return opn(path.join(staticDir, 'index.html'), {
        wait: false,
    });
}

const walk = (dir, callback) => {
    // Walk a directory tree, executing a callback function on all files
    return fs.lstat(dir)
        .then((stat) => {
            if (stat.isDirectory()) {
                // Ignore all hidden folders (including .git)
                if (path.basename(dir).startsWith('.')) return Promise.resolve();
                else return fs.readdir(dir).then((files) => {
                    // Recurse on subfolder
                    var childrens = [];
                    files.map((f) => {
                        childrens.push(walk(path.join(dir, f), callback));
                    });
                    return Promise.all(childrens);
                });
            } else {
                // Execute callback on file
                return callback(dir);
            }
        });
}

const replaceLinksInFile = (localRegexp, remoteUrl, file) => {
    // file has to be last argument to create partial
    return fs.readFile(file, 'utf8').then((data) => {
        var result = data.replace(localRegexp, remoteUrl);

        return fs.writeFile(file, result, 'utf8')
            .then(() => {
                // Return file name instead of undefined (from fs.writeFile)
                return Promise.resolve(file);
            });
    });
}

const replaceLinksInFolder = (staticDir, localUrl, domainUrl) => {
    // Replace all local links to host links in a folder
    // Remove protocol for URLs
    const protocolRegexp = new RegExp(/^(https?:)(?=\/\/)/, 'i');
    const localUrlNoProtocol = localUrl.replace(protocolRegexp, '');
    const domainUrlNoProtocol = domainUrl.replace(protocolRegexp, '');
    const localRegexp = new RegExp(`${localUrlNoProtocol}`, 'g');
    // null as first arg because this partial function is not a method
    var replaceLocalLinks = replaceLinksInFile.bind(null, localRegexp, domainUrlNoProtocol);
    return Promise.resolve(walk(staticDir, replaceLocalLinks));
}

// const flatten = function(arr, result = []) {
//     for (let i = 0, length = arr.length; i < length; i++) {
//         const value = arr[i];
//         if (Array.isArray(value)) {
//             flatten(value, result);
//         } else {
//             result.push(value);
//         }
//     }
//     return result;
// };

const addRemote = function(repo, remoteName, repoUrl) {
    // Return remote
    console.log('Adding remote', remoteName);
    return git.Remote.create(repo, remoteName, repoUrl)
        .catch((err) => {
            if (err.errno !== git.Error.CODE.EEXISTS) return Promise.reject(err);
            else {
                console.log('Remote exists');
                return git.Remote.lookup(repo, remoteName);
            }
        })
}

const credentials = function(url, userName) {
    // console.log('Get credentials for', userName);
    return git.Cred.sshKeyFromAgent(userName);
}

const commitAll = function(repo, index, signature) {
    // Return commit object (oid)
    console.log('commit all Files');
    return index.addAll()
        .then(() => {
            console.log(`writing tree ?`);
            return index.write();
        })
        .then(() => {
            console.log(`writing tree`);
            return index.writeTree();
        })
        .then((oidResult) => {
            treeId = oidResult;
            console.log('Get HEAD');
            return git.Reference.nameToId(repo, "HEAD");
        })
        .then((head) => {
            console.log('Get latest commit');
            return repo.getCommit(head);
        })
        .then((parent) => {
            console.log(`committing`);
            return repo.createCommit(
                "HEAD",
                signature,
                signature,
                "Ghost static blog update.",
                treeId, [parent],
            );
        })
}

const push = function(remote) {
    // Return errorcode
    console.log('git push');
    return remote.push(
        ["refs/heads/master:refs/heads/master"], {
            callbacks: {
                credentials: credentials,
                certificateCheck: function() {
                    // github will fail cert check on some OSX machines
                    // this overrides that check
                    return 1;
                }
            }
        }
    );
}


exports.deploy = function(config, view = false) {
    const staticDir = path.resolve(config.BUSTER_DIR); // Work with absolute paths
    // 1. Fix various things (transform local links to host in content, TODO : rename rss URL)
    return replaceLinksInFolder(staticDir, config.GHOST_URL, config.DOMAIN_URL)
        .then((files) => {
            // console.log(files);
            // TODO : remove 'undefined' from ${files} & flatten, if ${files} is used
            // 2. Upload to Host (rsync, custom root ?)
            // 3. open config.DOMAIN_URL ?

            // github pages:
            // 2.1. Check config.DOMAIN_URL hostname
            var remoteUrl = new url.URL(config.DOMAIN_URL);
            if (remoteUrl.hostname.endsWith('.github.io')) {
                // 2.2. get (or create?) repo
                console.log('Open repository');
                return git.Repository.open(path.resolve(staticDir, ".git"))
                    .then((repo) => {
                        let index, remote, treeId, repository;
                        repository = repo;
                        const signature = git.Signature.default(repository);

                        return repo.refreshIndex()
                            .then((indexId) => {
                                index = indexId;
                                // 2.3. git remote add 'buster' ${config.REPO_URL}
                                return addRemote(repository, 'buster', config.REPO_URL);
                            })
                            .then((rmt) => {
                                remote = rmt;
                                // 2.5. git commit -m
                                return commitAll(repository, index, signature);
                            })
                            .then(() => {
                                return push(remote);
                            });
                    })
                    .then(() => {
                        // 3. open config.DOMAIN_URL ?
                        if (view) {
                            return opn(
                                path.join(config.DOMAIN_URL), {
                                    wait: false,
                                }
                            );
                        } else return Promise.resolve();
                    });
            }
        })
        .catch((err) => {
            console.log(err);
            Promise.reject(err);
        });
}
