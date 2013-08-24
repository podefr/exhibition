// Karma configuration
// Generated on Mon Aug 12 2013 22:31:49 GMT+0100 (BST)

module.exports = function(config) {
  config.set({

    // base path, that will be used to resolve files and exclude
    basePath: '',


    // frameworks to use
    frameworks: ['mocha', 'requirejs'],


    // list of files / patterns to load in the browser
    files: [
      {pattern: 'public/js/**/*.js', included: false},
      {pattern: 'public/bower_components/emily-prod/Emily.js', included: true},
      {pattern: 'public/bower_components/olives-prod/Olives.js', included: true},
      {pattern: 'public/libs/*.js', included: false},
      {pattern: 'public/templates/*.html', included: false},
      {pattern: 'libs/sinon.js', included: false},
      {pattern: 'libs/chai.js', included: false},
      {pattern: 'test/**/*Spec.js', included: false},
      'test/main.js'
    ],


    // list of files to exclude
    exclude: [

    ],


    // test results reporter to use
    // possible values: 'dots', 'progress', 'junit', 'growl', 'coverage'
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['Chrome'],


    // If browser does not capture in given timeout [ms], kill it
    captureTimeout: 60000,


    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false
  });
};
