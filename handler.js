'use strict';
const pris = require('@prisma/client')
const prisma = new pris.PrismaClient();


module.exports.getusers = async (event) => {
  const users = await prisma.user.findMany();
  return {
    statusCode: 200,
    body: JSON.stringify({ users }),
  }
}
module.exports.postusers = async (event) => {
  try {
    const { body } = event;
    const bodyjs = JSON.parse(body)
    const exist = await prisma.user.findUnique({ where: { email: bodyjs.email } })
    if (exist) {
      throw new Error("Email ya esta registrado");
    }
    const user = await prisma.user.create({ data: bodyjs });
    return {
      statusCode: 200,
      body: JSON.stringify({ user }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    }
  }
}
module.exports.upcharge = async (event) => {
  const { body, pathParameters } = event;
  const bodyjs = JSON.parse(body);
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(pathParameters.id) } })
    if (!user) {
      throw new Error("Usuario no encontrado");
    }
    const total = Number(bodyjs.subtotal);
    const balance = total + Number(user.balance);
    const updateUser = await prisma.user.update({
      where: {
        id: Number(pathParameters.id)
      },
      data: {
        balance: balance
      }
    });
    await prisma.ordenProducto.create({
      data: {
        id_user: user.id,
        producto: "recarga",
        subtotal: Number(bodyjs.subtotal),
        total,
      }
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ updateUser })
    }

  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    }
  }
};
module.exports.getorden = async (event) => {
  const ordenes = await prisma.ordenProducto.findMany();
  return {
    statusCode: 200,
    body: JSON.stringify({ ordenes }),
  }
}
module.exports.postorden = async (event) => {
  const { body, pathParameters } = event;
  const bodyjs = JSON.parse(body)
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: Number(pathParameters.id)
      }
    });
    if (!user) throw new Error("Usuario no encontrado");

    const totalProducto = Number(bodyjs.subtotal) + Number(bodyjs.subtotal) * 0.19

    if (user.balance < totalProducto) {
      throw new Error("No tiene fondos suficientes para realizar la transaccion");
    }
    //Impuesto del iva 

    const orden = await prisma.ordenProducto.create({
      data: {
        id_user: user.id,
        producto: bodyjs.producto,
        subtotal: -Number(bodyjs.subtotal),
        total: -totalProducto,
      }
    });
    const totalUser = Number(user.balance) - totalProducto;

    await prisma.user.update({
      where: {
        id: Number(pathParameters.id)
      },
      data: {
        balance: totalUser
      }
    });
    return {
      statusCode: 200,
      body: JSON.stringify({ orden }),
    };
  } catch (error) {

    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    }
  }
};

module.exports.send = async (event) => {
  const { body, pathParameters } = event;
  const bodyjs = JSON.parse(body);
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: Number(pathParameters.id)
      }
    });
    if (!user) throw new Error("Usuario no encontrado");
    //console.log(user.balance , bodyjs.total);
    const total = Number(bodyjs.subtotal)
    if (user.balance < total) {
      throw new Error("No tiene fondos suficientes para realizar la transaccion");
    }
    const userToTransfer = await prisma.user.findUnique({
      where: {
        id: bodyjs.id
      }
    });
    if (!userToTransfer) throw new Error("Usuario no encontrado");
    const orden = await prisma.ordenProducto.create({
      data: {
        id_user: user.id,
        producto: `Transferiacia al usuario: ${userToTransfer.name} ID: ${userToTransfer.id}`,
        subtotal: -Number(bodyjs.subtotal),
        total: -total,
      }
    });
    await prisma.user.update({where: {id: user.id}, data: {balance: user.balance-total}})
    await prisma.ordenProducto.create({
      data: {
        id_user: userToTransfer.id,
        producto: `Transferiacia del usuario: ${user.name} ID: ${user.id}`,
        subtotal: Number(bodyjs.subtotal),
        total: total,
      }
    });
    await prisma.user.update({where: {id: userToTransfer.id}, data: {balance: Number(userToTransfer.balance)+total}})
    return {
      statusCode: 200,
      body: JSON.stringify(orden)
    }
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    }
  }

}