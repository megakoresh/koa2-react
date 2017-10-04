module.exports =
class Controller {
  constructor(router){
    this.router = router; //keep the referce to the router? It may not be needed here actually
    //place here all your static routes (e.g. index, about, etc.)
    router.get('/', this.index);
    router.get('/about', this.about);
  }

  async index(ctx, next){
    return ctx.view('views/index.pug', {list: [{ name: 'Create backend', completed: true }]});
  }

  async about(ctx, next){
    return ctx.view('views/about.pug');
  }
}