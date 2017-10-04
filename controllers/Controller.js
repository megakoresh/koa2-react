module.exports =
class Controller {
  constructor(router){
    this.router = router; //keep the referce to the router? It may not be needed here actually
    //place here all your static routes (e.g. index, about, etc.)
    router.get('/', this.index);
    router.get('/about', this.about);
  }

  async index(ctx, next){
    return ctx.view('views/index.pug', {list: [
      { name: 'Create stack', completed: true },
      { name: 'Setup webpack', completed: true },
      { name: 'Write tests', completed: true },
      { name: 'Fix tests', completed: false },
      { name: 'Write real React components', completed: false },
      { name: 'Debug real React components', completed: false },
      { name: 'Test remote logins', completed: false },
      { name: 'Hook up database', completed: false }
    ]});
  }

  async about(ctx, next){
    return ctx.view('views/about.pug');
  }
}