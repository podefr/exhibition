build: clean public/js/exhibition.min.js

styles:
	compass compile

watch:
	watchify -r ./js/main.js:exhibition -o public/js/exhibition.js

public/js/exhibition.js:
	browserify -r ./js/main.js:exhibition -o public/js/exhibition.js

public/js/exhibition.min.js: public/js/exhibition.js
	uglifyjs public/js/exhibition.js -o public/js/exhibition.min.js

clean:
	rm -f public/js/exhibition.*js

.PHONY: styles