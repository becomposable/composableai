import colors from "ansi-colors";
import { Command } from "commander";
import { getClient } from "../client.js";

export function listProjects(program: Command) {
    const client = getClient(program);
    const activeProject = client.project;
    getClient(program).projects.list().then((projects) => {
        projects.map(project => {
            const check = activeProject === project.id ? " " + colors.symbols.check : "";
            console.log(project.name + ` [${project.id}]` + check);
        })
    })
}