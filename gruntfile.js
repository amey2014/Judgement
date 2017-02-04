'use strict';
module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
          //grunt task configuration will go here  
        /**/
        /*copy: {
          main: {
            expand: true,
            src: ['./**', '!./node_modules/**', '!./.settings/**', '!./path/**'],
            dest: '../JudgementBuild/',
          },
        },*/
        /*ngAnnotate: {
            options: {
                singleQuotes: true
            },
            app: { //"app" target
                files: {
                    './dest/scripts/min-safe/app.js': ['./client/scripts/app.js']
                }
            }
        },
        concat: {
            js: { //target
                src: ['./min-safe/client/scripts/app.js','./public/min-safe/*.js'],
                dest: './client/scripts/min/app.js'
            }
        },*/
        uglify: {
            js: { //target
                files: [{
                      expand: true,
                      src: ['./**/*.js', '!./node_modules/**/*', '!./client/lib/**/*'],
                      //src: ['../JudgementBuild/**/*.js','!../JudgementBuild/client/lib/**/*']
                }]
            }
        }  
    });

    //load grunt tasks
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-ng-annotate'); 
    grunt.loadNpmTasks('grunt-contrib-copy');

    //register grunt default task
    grunt.registerTask('default', [ 'uglify' ]);
}