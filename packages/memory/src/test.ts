
const promise = new Promise((resolve, _reject) => {
    setTimeout(() => {
        console.log("Promise timeout");
        resolve(123);
    }, 1000);
    console.log("Promise started");
})
console.log('>>>>>>>', promise);