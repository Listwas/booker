// downscale in the browser, backend stores a small jpeg data-url
export function resizeImage(file: File, maxW: number, maxH: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
            const scale = Math.min(1, maxW / img.width, maxH / img.height)
            const canvas = document.createElement("canvas")
            canvas.width = Math.round(img.width * scale)
            canvas.height = Math.round(img.height * scale)
            canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
            URL.revokeObjectURL(url)
            resolve(canvas.toDataURL("image/jpeg", 0.85))
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error("not an image"))
        }
        img.src = url
    })
}
