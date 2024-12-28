import React, { useEffect, useRef, useState } from "react";
import {SWATCHES} from '@/constants';
import { ColorSwatch,Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import axios from "axios";
import Draggable from 'react-draggable';



interface GeneratedResult{
    expressions:string;
    answer:string;
}
interface Response {
    expr: string;
    result:string;
    assign:boolean;
}



export default function Home(){
const canvasRef = useRef<HTMLCanvasElement>(null);
const [isDrawing, setisDrawing]= useState(false);//for identification that user is drwaing or not
const[color,setColor] = useState('rgb(255,255,255)');
const [reset, setReset]= useState(false);
const[result, setResult] = useState<GeneratedResult>();
const [latexExpression, setlatexExpression] = useState<Array<string>>([]);
const [latexPosition, setlatexPosition] = useState({x:10, y:200});
const[dictOfVars, setDictOfVars]= useState({});

///reset use eff
 useEffect(()=>{
    if(reset){
        resetCanvas();
        setReset(false);
        setlatexExpression([]);
        setResult(undefined);
        setDictOfVars({});

    }
 }, [reset]);

 //latex
 useEffect(()=>{
if(latexExpression.length > 0 && window.MathJax){
    setTimeout(() => {
        window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
    }, 0);
}
 }, [latexExpression])



//render latex canvas
useEffect(()=>{
    if(result){
        renderLatexToCanvas(result.expressions, result.answer);

    }
}, [result])





//for the first intialisaton of website
useEffect(()=>{
    const canvas = canvasRef.current;
    if(canvas){
        const ctx =canvas.getContext('2d');
        if(ctx){
            canvas.width= window.innerWidth;
            canvas.height= window.innerHeight-canvas.offsetTop;
            ctx.lineCap= 'round';
            ctx.lineWidth=3;

        }
    }
    // this function is used to draw the background image when the window is resized
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.0.0/es5/latest?tex-mml-chtml.js";
    script.async=true;
    document.head.appendChild(script);
    script.onload =()=>{
        window.MathJax.Hub.Config({
            tex2jax: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$']],
                processEscapes: true,
            },
            "HTML-CSS": { linebreaks: { automatic: true } },
        })
    };

    return ()=>{
        document.head.removeChild(script);
    }

},[]);


const renderLatexToCanvas= (expression:string, answer:string)=>{
const latex = `({${expression} = ${answer}})`;
setlatexExpression([...latexExpression, latex]);
const canvas = canvasRef.current;
if(canvas){
    const ctx = canvas.getContext('2d');
    if(ctx){
        ctx.clearRect(0,0, canvas.width, canvas.height )
    } 
}
}

//send data canvas function    

const sendCanvasData = async () => {
    const canvas = canvasRef.current;

    if(canvas){
        console.log('sending data.....', `${import.meta.env.VITE_API_URL}`)
    const response= await axios({
        method:'post',
        url: `${import.meta.env.VITE_API_URL}/calculate`,
        data:{
            image:canvas.toDataURL('image/png'),
            dict_of_vars:dictOfVars,
        }
    });

 
    const resp = await response.data;
    console.log('Response', resp);
    resp.data.forEach((data: Response)=> {
        if(data.assign === true){
            setDictOfVars({
                ...dictOfVars,
                [data.expr]:data.result
            });
        }
    });
    
    
    const ctx = canvas.getContext('2d');
    const imageData = ctx!.getImageData(0,0,canvas.width, canvas.height);
    let minX = canvas.width, minY = canvas.height, maxX=0, maxY=0;
   
    for(let y =0; y<canvas.height; y++){
        for(let x=0; x<canvas.width; x++){
            const i =(y*canvas.width +x)*4;
            if(imageData.data[i+3] > 0){
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }
    const centerX= (minX+maxX)/2;
    const centerY= (minY+maxY)/2;

    setlatexPosition({x: centerX,y: centerY});
    resp.data.forEach((data:Response)=>{
        setTimeout(() => {
            setResult({
                expressions: data.expr,
                answer: data.result
            })
        }, 200);
    });

   }
};




//reset canavs function
const resetCanvas=()=>{
    const canvas = canvasRef.current;
    if(canvas){
        const ctx= canvas.getContext('2d');
        if(ctx){
            ctx.clearRect(0,0, canvas.width, canvas.height )
        }
    }
};
//user start drawing
const startDrawing =(e:React.MouseEvent<HTMLCanvasElement>)=>{
    const canvas= canvasRef.current;
    if(canvas){
    canvas.style.background = 'black';
    const ctx = canvas.getContext('2d');
    if(ctx){
        ctx.beginPath();
        ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
        setisDrawing(true);
    }
    }
   
};
//stop drawing
const stopDrawing =()=>{
    setisDrawing(false);
}

//method for drwaing
const draw = (e:React.MouseEvent<HTMLCanvasElement>)=>{
    if(!isDrawing){
        return;
    }

    const canvas = canvasRef.current;
    if(canvas){
        const ctx = canvas.getContext('2d');
        if(ctx){
            ctx.strokeStyle= color;
            ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
            ctx.stroke();
        }
    }
}

return(
   <>
   <div className='grid grid-cols-3 gap-2'>
    <Button 
    onClick={()=>setReset(true)}
    className='z-20 bg-black text-white'
    variant='default'
    color="black"
    > Reset
    </Button>
     <Group className='z-20'>
     {SWATCHES.map((swatchcolor:string)=>(
     <ColorSwatch
         key={swatchcolor}
         color={swatchcolor}
         onClick={()=>setColor(swatchcolor)}
         />
     ))}
     </Group>

    <Button 
    onClick={sendCanvasData}
    className='z-20 bg-black text-white'
    variant='default'
    color="white"
    >
    Calculate
    </Button>

   </div>
   <canvas
   ref={canvasRef}
   id='canvas'
   className='absolute top-0 left-0 w-full h-full'
   onMouseDown={startDrawing}
   onMouseOut={stopDrawing}
   onMouseUp={stopDrawing}
   onMouseMove={draw}
   />
   {latexExpression && latexExpression.map((latex, index)=>(
    <Draggable
     key={index}
      defaultPosition={latexPosition} 
      onStop={(_, data) => setlatexPosition({x: data.x, y: data.y})}
      >
        <div className='absolute text-white '>
            <div className='latex-content'>{latex}</div>
        </div>
    </Draggable>
   ))}
   </>
);
}