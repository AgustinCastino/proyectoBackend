const express = require('express')
const { Router } = express
const fs = require('fs')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Permisos de admin
let admin = true

// Class Producto
class Administrador {

    constructor(nombreArchivo) {
        this.nombreArchivo = nombreArchivo
    }

    async save(objProductos) {
        try {
            let data = await fs.promises.readFile(this.nombreArchivo, 'utf8')
            data = JSON.parse(data)

            let id

            if (data.length == 0) {
                id = 1
            } else {
                id = 1
                for (let i = 0; i < data.length; i++) {
                    if (data[i].id > id) {
                        id = data[i].id
                    }
                }
                id++
            }
            objProductos.id = id

            data.push(objProductos)
            await fs.promises.writeFile(this.nombreArchivo, JSON.stringify(data, null, 2))
            return ('Agregado con id: ' + id);
        }
        catch (err) {
            console.log('No se pudo gudardar el producto.  ' + err);
        }
    }

    async getById(id) {
        let data = await fs.promises.readFile(this.nombreArchivo, 'utf8')
        data = JSON.parse(data)

        let productoBuscado = data.find(item => item.id == id)

        if (productoBuscado) {
            return (productoBuscado);
        } else {
            return (`No se encontró producto con el id ${id}`);
        }
    }

    async getAll() {
        try {
            let data = await fs.promises.readFile(this.nombreArchivo, 'utf8')
            data = JSON.parse(data)
            return (data)
        } catch (err) {
            console.log(err);
        }
    }

    async edit(id, editado) {
        try {

            let data = await fs.promises.readFile(this.nombreArchivo, 'utf8')
            data = JSON.parse(data)

            // Elimino el objeto con la info antigua
            const nuevoArr = data.filter(item => item.id != id)

            // Agrego el objeto editado
            nuevoArr.push(editado)

            // Escribo el nuevo en el .txt
            await fs.promises.writeFile(this.nombreArchivo, JSON.stringify(nuevoArr, null, 2))


            return (`agregado`)
        } catch (err) {
            console.log(err);
        }
    }

    async deleteById(id) {
        try {
            let data = await fs.promises.readFile(this.nombreArchivo, 'utf8')
            data = JSON.parse(data)

            const nuevoArr = data.filter(item => item.id != id)

            await fs.promises.writeFile(this.nombreArchivo, JSON.stringify(nuevoArr, null, 2))
            return (`id ${id} fue eliminado`);

        } catch (err) {
            return ('Error: ' + err);
        }
    }

    async deleteAll() {

        try {
            await fs.promises.writeFile(this.nombreArchivo, '[]')
            console.log('Se vació el arr');
        } catch (err) {
            console.log('No se pudo vaciar');
        }
    }

}

// Iniciar las clases
const prod = new Administrador('productos.txt')
const carrito = new Administrador('carrito.txt')

// Productos
const routerProductos = new Router()

routerProductos.get('/:id?', async (req, res) => {
    let { id } = req.params
    if (id) {
        res.send(await prod.getById(id))
    } else {
        res.send(await prod.getAll())
    }
})

routerProductos.post('/', (req, res) => {
    if (admin) {
        const { nombre, precio, stock, url, descripcion, codigo } = req.body
        const nuevoProducto = {
            nombre,
            precio,
            stock,
            url,
            descripcion,
            codigo,
            timestamp: Date.now()
        }
        prod.save(nuevoProducto)

        res.send({ nuevoProducto })
    } else {
        res.send({err: '-1', descripcion:'No tiene permisos de admin activo'})
    }
})

routerProductos.put('/:id', async (req, res) => {
    if(admin){

        let { id } = req.params
        let productoBuscado = await prod.getById(id)
    
        const { nombre, precio, stock, url, descripcion, codigo } = req.body
        const productoEditado = {
            id: productoBuscado.id,
            nombre,
            precio,
            stock,
            url,
            descripcion,
            codigo,
            timestamp: Date.now()
        }
    
        await prod.edit(id, productoEditado)
    
        res.send('Producto editado')
    }else{
        res.send({err: '-1', descripcion:'No tiene permisos de admin activo'})
    }
})

routerProductos.delete('/:id', async (req, res) => {
    if (admin) {
        let { id } = req.params
        res.send('Producto con ' + await prod.deleteById(id))
    } else {
        res.send({err: '-1', descripcion:'No tiene permisos de admin activo'})
    }
})

// Carrito
const routerCarrito = new Router()

routerCarrito.get('/:id/productos', async (req, res) => {
    let { id } = req.params
    res.send(await carrito.getById(id))
})

routerCarrito.post('/', async (req, res) => {
    const nuevoCarrito = {
        timestamp: Date.now(),
        productos: []
    }
    res.send(await carrito.save(nuevoCarrito))
})

routerCarrito.delete('/:id', async (req, res) => {
    let { id } = req.params
    res.send('Carrito con ' + await carrito.deleteById((id)))
})

routerCarrito.post('/:id/productos/:idProducto', async (req, res) => {
    let { id, idProducto } = req.params

    //Busco el producto a agregar
    let productoAgregado = await prod.getById(idProducto)

    //Busco el carrito en donde se agregara el producto
    let carritoSeleccionado = await carrito.getById(id)

    // Agrego al carrito el nuevo producto
    carritoSeleccionado.productos.push(productoAgregado)

    // Edito el carrito.txt
    carrito.edit(id, carritoSeleccionado)

    res.send('Agregado')

})

routerCarrito.delete('/:id/productos/:idProducto', async (req, res) => {
    let { id, idProducto } = req.params

    //Busco el carrito en donde se eliminará el producto
    let carritoSeleccionado = await carrito.getById(id)

    // Modifico los productos del objeto seleccionado
    carritoSeleccionado.productos = carritoSeleccionado.productos.filter(item => item.id != idProducto)

    // Edito el carrito.txt
    await carrito.edit(id, carritoSeleccionado)

    res.send('Eliminado')
})

//Cargar routers
app.use('/api/productos', routerProductos)
app.use('/api/carrito', routerCarrito)

//Server

app.use((req,res)=>{
    res.status(404).json({
        status: 'Error -2'
    })
})
const PORT = process.env.PORT || 8080

const server = app.listen(PORT, () => {
    console.log('Servidor escuchando en puerto ' + PORT);
})
