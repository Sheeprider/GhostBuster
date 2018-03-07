// Get or set the default environment
// process.env.NODE_ENV = process.env.NODE_ENV || 'development';
exports.CONFIG = {
    BUSTER_DIR: process.env.BUSTER_DIR || './static',
    GHOST_URL: process.env.GHOST_URL || 'http://localhost:2368/',
    // Only github pages will work for now
    DOMAIN_URL: process.env.DOMAIN_URL || 'https://Sheeprider.github.io/',
    // Please use "git@github.com:User/repo" form instead of "https://github.com/user/repo"
    REPO_URL: process.env.REPO_URL || 'git@github.com:Sheeprider/Sheeprider.github.io',
}

//  =================
//  = Code examples =
//  =================
// const buster = require('./buster');
// buster.setup(config);
// buster.generate(config);
// buster.preview(config);
// buster.deploy(config);

// return buster.setup(config, true)
//     .then(() => {
//         console.log('setup ok');
//         return buster.generate(config)
//     })
//     .then(() => {
//         console.log('generate ok');
//         return buster.deploy(config);
//     }).catch((err) => {
//         console.log(err);
//         return Promise.reject(err);
//     });
