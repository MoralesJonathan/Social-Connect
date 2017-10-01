var gulp = require('gulp');
var del = require('del');
var uglify = require('gulp-uglify');
var cleanCSS = require('gulp-clean-css');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var plumber = require('gulp-plumber');
var autoprefixer = require('gulp-autoprefixer');


gulp.task('sass', function() {
  return gulp.src('dev/sass/*.sass')
    .pipe(plumber(function(error) {
      console.log(error.toString());
      this.emit('end');
    }))
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('public/css/'));
});

gulp.task('scss', function() {
  return gulp.src('dev/sass/*.scss')
    .pipe(plumber(function(error) {
      console.log(error.toString());
      this.emit('end');
    }))
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('public/css/'));
});

gulp.task('minjs',  function() {
  return gulp.src('dev/js/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('public/js/'));
});

gulp.task('mincss',['autoprefix'], function() {
  return gulp.src('public/css/*.css')
    .pipe(cleanCSS({
      compatibility: '*'
    }))
    .pipe(gulp.dest('public/css/'));
});

gulp.task('autoprefix', function() {
  return gulp.src('public/css/*.css')
    .pipe(autoprefixer())
    .pipe(gulp.dest('public/css/'));
});

gulp.task('movejs',  function() {
  return gulp.src('dev/js/*.js').pipe(gulp.dest('public/js/'));
});

gulp.task('movecss', function() {
  return gulp.src('dev/css/*.css').pipe(gulp.dest('public/css/'));
});

gulp.task('movemaps', function() {
  return gulp.src('dev/css/*.map').pipe(gulp.dest('public/css/'));
});

gulp.task('deleteMaps', ['mincss'], function() {
  return del([
    'public/css/*.map'
  ]);
});

gulp.task('watchdev', function() {
  gulp.watch('dev/sass/sassy/*.sass');
  gulp.watch('dev/sass/*.sass', ['sass']);
  gulp.watch('dev/sass/*.scss');
  gulp.watch('dev/sass/*.scss', ['scss']); 
  gulp.watch('dev/css/*.css', ['movecss']);
  gulp.watch('dev/js/main/*.js');
  gulp.watch('dev/js/*.js', ['movejs']);
});

gulp.task('default', ['sass', 'scss','movecss', 'movejs', 'movemaps', 'autoprefix'], function() {});

gulp.task('watch', [ 'sass','scss', 'movecss', 'movejs', 'movemaps', 'autoprefix', 'watchdev'], function() {});

gulp.task('production', ['sass','scss', 'minjs', 'autoprefix', 'mincss', 'deleteMaps'], function() {});