#Buster Workflow

##Requierments

- Ghost
- Buster
- Git
- Grunt, node
- Host (Github, ...)

##Usage

1. Fill `config.js`
2. Start your Ghost local server `grunt dev`
3. Run `grunt setup`
4. Run `grunt generate`
5. (Optional) Run `grunt preview`
6. Run `grunt deploy`
7. Just run `grunt` for subsequent generate/deploy

##Workflow

1. Setup a git repository to receive static Ghost pages
2. Generate static pages
3. (Optional) Preview local static version
4. Deploy static pages to Host


##Setup

TODO : empty ${staticDir} (except .git) ?
Create .git
=> Won't work if remote git is not clean
Create git branch

##Generate

1. TODO : (Optional) Start Ghost web server
2. Get index and all pages listed in sitemap and download them in ${staticDir}
3. TODO : Get all RSS links from "https://feedly.com/i/subscription/feed/http://localhost:2368/rss/" links and download them
4. TODO : (Optional, goes with 1.) Stop Ghost web server

##Preview

1. Open index/root in browser

##Deploy

1. Fix various things (transform local links to host in content, TODO : transform rss URLs)
2. Git commit
3. Connect to host
4. Upload to Host (github pages for now, rsync ?)
