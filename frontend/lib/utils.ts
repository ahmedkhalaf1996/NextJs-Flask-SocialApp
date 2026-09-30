import {clsx, type ClassValue} from 'clsx'
import {twMerge} from 'tailwind-merge'

export function cn(...inputs: ClassValue[]){
    return twMerge(clsx(inputs))
}

// func to convert file to base64
export const convertBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject)=> {
        const fileReader = new FileReader();
        fileReader.readAsDataURL(file);

        fileReader.onload = ()=> {
            resolve(fileReader.result as string);
        }

        fileReader.onerror = (erorr) => {
            reject(erorr);
        }
    })
}