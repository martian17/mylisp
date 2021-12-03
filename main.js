
let txtbuf = "";

const matchSpace = function(str,i){
    while(i < str.length && str[i].match(/\s/)){
        i++;
    }
    return i;
};

const parseList = function(str,i){
    if(i >= str.length)return [null,i];
    i = matchSpace(str,i);
    if(str[i]==="("){
        i++;
        let ret = [null,null];
        let tail = ret;
        // parse list
        while(str[i] !== ")"){
            let result;
            [result,i] = parseList(str,i);
            tail[1] = [result,null];
            //tb.value+=JSON.stringify(tail)+"\n";
            tail = tail[1];
            i = matchSpace(str,i);
            if(i >= str.length)break;
        }
        i++;
        return [ret[1],i];
    }else if(str[i] === "\""){
        i++;
        let text = "";
        for(; i < str.length; i++){
            if(str[i] === "\""){
                i++;
                break;
            }else if(str[i] === "\\"){
                i++;
                text += str[i];
            }else{
                text += str[i];
            }
        }
        return [text,i];
    }else if(str[i].match(/[0-9]/)){
        let text = "";
        for(; i < str.length; i++){
            if(str[i].match(/[\s\(\)]/)){
                break;
            }else{
                text+=str[i];
            }
        }
        return [parseFloat(text),i];
    }else{
        let text = "";
        for(; i < str.length; i++){
            if(str[i].match(/[\s\(\)]/)){
                break;
            }else{
                text+=str[i];
            }
        }
        return [{
            name:text,
            type:"id"
        },i];
    }
};

const execast = function(ast,namespace){
    if(!ast){
        return ast;
    }if(ast.type==="id"){
        return namespace[ast.name];
    }else if(typeof ast === "object"){
        const fn = execast(ast[0],namespace);
        return fn(ast[1],namespace);
    }else{
        return ast;
    }
};

const ns = {
    "true":true,
    "false":false,
    "null":null,
    print:function(arg,namespace){
        const val = execast(arg[0],namespace);
        try{
            txtbuf+="> "+JSON.stringify(val,null,2)+"\n";
        }catch(err){
            txtbuf+="> "+val+"\n";
        }
        return val;
    },
    stdout:function(arg,namespace){
        const val = execast(arg[0],namespace);
        txtbuf+=val;
        return val;
    },
    let:function(arg,namespace){
        //console.log(arg);
        let a = arg[0];
        let ns1 = Object.create(namespace);
        while(a){
            const name = a[0][0].name;
            const content = execast(a[0][1][0],ns1);
            ns1[name] = content;
            a = a[1];
        }
        return execast(arg[1][0],ns1);
    },
    lambda:function(arg1,namespace){
        return function(arg2,namespace2){
            const arglist = arg1[0];
            const body = arg1[1][0];
            let a = arg1[0];
            let b = arg2;
            let ns1 = Object.create(namespace);
            while(a && b){
                let argname = a[0].name;
                //console.log(a,argname);
                ns1[argname] = execast(b[0],namespace2);
                //console.log(ns1[argname]);
                a = a[1];
                b = b[1];
            }
            //console.log(body);
            return execast(body,ns1);
        };
    },
    cond:function(arg1,namespace){
        const statement = arg1[0];
        const body1 = arg1[1][0];
        const body2 = arg1[1][1][0];
        if(execast(statement,namespace)){
            return execast(body1,namespace);
        }else{
            return execast(body2,namespace);
        }
    },
    "+":function(arg,namespace){
        let a = arg;
        let result = 0;
        while(a){
            result += execast(a[0],namespace);
            a = a[1];
        }
        return result;
    },
    "*":function(arg,namespace){
        let a = arg;
        let result = 1;
        while(a){
            result *= execast(a[0],namespace);
            a = a[1];
        }
        return result;
    },
    "begin":function(arg,namespace){
        let a = arg;
        let result = null;
        while(a){
            result = execast(a[0],namespace);
            a = a[1];
        }
        return result;
    },
    "%":function(arg,namespace){
        let a = arg;
        let result = execast(a[0],namespace);
        a = a[1];
        while(a){
            result %= execast(a[0],namespace);
            a = a[1];
        }
        return result;
    },
    "-":function(arg,namespace){
        if(!arg[1]){//null
            return -execast(arg[0],namespace);
        }else{
            let a = arg;
            let result = execast(arg[0],namespace);
            a = a[1];
            while(a){
                result -= execast(a[0],namespace);
                a = a[1];
            }
            return result;
        }
    },
    "/":function(arg,namespace){
        if(!arg[1]){//null
            return execast(arg[0],namespace);
        }else{
            let a = arg;
            let result = execast(arg[0],namespace);
            a = a[1];
            while(a){
                result /= execast(a[0],namespace);
                a = a[1];
            }
            return result;
        }
    },
    "=":function(arg,namespace){
        let a = arg[0];
        let b = arg[1][0];
        return execast(a,namespace) === execast(b,namespace);
    },
    "!=":function(arg,namespace){
        let a = arg[0];
        let b = arg[1][0];
        return execast(a,namespace) !== execast(b,namespace);
    },
    ">=":function(arg,namespace){
        let a = arg[0];
        let b = arg[1][0];
        return execast(a,namespace) >= execast(b,namespace);
    },
    "<=":function(arg,namespace){
        let a = arg[0];
        let b = arg[1][0];
        return execast(a,namespace) <= execast(b,namespace);
    },
    ">":function(arg,namespace){
        let a = arg[0];
        let b = arg[1][0];
        return execast(a,namespace) > execast(b,namespace);
    },
    "<":function(arg,namespace){
        let a = arg[0];
        let b = arg[1][0];
        return execast(a,namespace) < execast(b,namespace);
    },
    "car":function(arg,namespace){
        return execast(arg[0],namespace)[0];
    },
    "cdr":function(arg,namespace){
        return execast(arg[0],namespace)[1];
    },
    "list":function(arg,namespace){
        let a = arg;
        let result = 0;
        while(a){
            a[0] = execast(a[0],namespace);
            a = a[1];
        }
        return arg;
    },
    "cons":function(arg,namespace){
        const a = arg[0];
        const b = arg[1][0];
        return [execast(a,namespace),execast(b,namespace)];
    },
    "nil":function(arg,namespace){
        return null;
    }
};

const executeLisp=function(str){
    const [ast,i]=parseList(str,0);
    console.log(ast);
    //return JSON.stringify(ast);
    return execast(ast,ns);
};

const ta=document.querySelector("#a");
ta.value=
`(let(
(range (lambda
  (a b)
  (cond
    (< a b)
    (cons a (range (+ a 1) b))
    null
  )
))
(map (lambda
  (lst cb)
  (cond (= null lst)
    null
    (cons (cb (car lst)) (map (cdr lst) cb))
  )
))
(reduce (lambda
  (lst cb)
  (cond (= null lst)
    null
    (cond (= null (cdr lst))
      (car lst)
      (cb (car lst) (reduce (cdr lst) cb))
    )
  )
))
(reverse_kernel (lambda(lst lst2)
  (cond
  (= null lst)
  lst2
  (reverse_kernel (cdr lst) (cons (car lst) lst2))
  )
))
(reverse (lambda(lst)
  (reverse_kernel lst null)
))
(for (lambda(i n cb)
  (cond (< i n)(*(cb i)(for (+ i 1) n cb))0)
))
(printLst_kernel (lambda(lst)
  (cond
    (= lst null)
    (stdout " -|
")
    (begin
    (stdout " ")
    (stdout (car lst))
    (printLst_kernel (cdr lst))
    )
  )
))
(printLst (lambda(lst)
  (begin
  (stdout "|-")
  (printLst_kernel lst)
  )
))
(getPrimes (lambda(i n primes)
(cond (< i n)
  (cond
    (begin
      (print i)
      (stdout "primes under ")
      (stdout i)
      (stdout " : ")
      (printLst primes)
      (stdout "mapping ")
      (stdout i)
      (stdout "%prime: ")
      (printLst (map primes (lambda(p)(% i p))))
      (= 0 (reduce (map primes (lambda(p)(% i p))) *) )
    )
    (getPrimes (+ i 1) n primes)
    (getPrimes (+ i 1) n (cons i primes))
  )
  (reverse primes)
)
))
)

(begin
(nil is basically a comment in my flavor of lisp)
(nil printLst (range 0 10))
(nil printLst (map(range 0 10)(lambda(a)(* a 2))))
(stdout "If there are any 0s in the mapped list, the number is not a prime
")
(printLst (getPrimes 2 20 null))
"")

)`
/*`(let(
(fib (lambda 
  (n)
  (cond (< n 2)
    1
    (+ (fib(- n 1)) (fib(- n 2)))
  )
))
(for (lambda(i n cb)
  (cond (< i n)(*(cb i)(for (+ i 1) n cb))0)
))
)
(for 0 10 (lambda(i)
(print (fib i))
))
)`;*/
/*`(let(
(mul (lambda(n)(+ n n n)))
)
(print (mul 5))
)`*/
//`(let((a 12)(b 5))(print (+ a b)))`;
//"(print(+(+ 5 7) 12)))";
const tb=document.querySelector("#b");

const bb=document.querySelector("input");

bb.addEventListener("click",function(){
    txtbuf="";
    const result = executeLisp(ta.value);
    tb.value = txtbuf;
    tb.value+=result;
});



