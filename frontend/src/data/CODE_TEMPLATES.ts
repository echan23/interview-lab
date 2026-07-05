/*
Starter boilerplate inserted when switching languages, so compiled languages
run out of the box on Piston (go run / javac / gcc need a complete program).
Only applied when the editor is empty or still holds an unmodified template,
so real work is never overwritten.
*/
const CODE_TEMPLATES: Record<string, string> = {
  python: "",
  javascript: "",
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, InterviewLab!");
    }
}
`,
  c: `#include <stdio.h>

int main() {
    printf("Hello, InterviewLab!\\n");
    return 0;
}
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    cout << "Hello, InterviewLab!" << endl;
    return 0;
}
`,
  go: `package main

import "fmt"

func main() {
    fmt.Println("Hello, InterviewLab!")
}
`,
};

export default CODE_TEMPLATES;
