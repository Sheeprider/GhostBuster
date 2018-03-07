const buster = require('./buster');
const config = require('./config');

module.exports = function(grunt) {

    grunt.initConfig({
        setup: config.CONFIG,
        generate: config.CONFIG,
        preview: config.CONFIG,
        deploy: config.CONFIG,
    });

    grunt.registerTask('setup', 'Setup a static dir and git for Buster.', function(s){
        var done = this.async();
        buster.setup(grunt.config('setup'), true)
            .then(function(){
                done();
            });
            // .catch(done(false));
    });
    grunt.registerTask('generate', 'Generate all static files from Ghost.', function(){
        var done = this.async();
        buster.generate(grunt.config('generate'))
            .then(function(){
                done();
            });
    });
    grunt.registerTask('preview', 'Preview result in default browser.', function(){
        var done = this.async();
        buster.preview(grunt.config('preview'))
            .then(function(){
                done();
            });
    });
    grunt.registerTask('deploy', 'Fix links and deploy to remote host.', function(){
        var done = this.async();
        buster.deploy(grunt.config('deploy'))
            .then(function(){
                done();
            });
    });
    grunt.registerTask('default', 'Generate and deploy ghost site', ['generate', 'deploy']);

};
