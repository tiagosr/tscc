module.exports = {
    reporter: "spec",
    color: true,
    package: "./package.json",
    spec: [
        "tests/js_test_units/**/*.js"
    ],
    watch_files: [
        "src/**/*.js",
        "arch/**/*.js",
        "tests/js_test_units/*.js",
    ]
}