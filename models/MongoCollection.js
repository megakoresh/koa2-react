const Collection = require('./Collection');
const { MongoDatabase } = require('database');
const mongodb = require('mongodb');
const { Utils, Logger } = require('common');
const Model = require('./Model');

/**
 * An example of implementing an associated collection of records using MongoDB
 * If you use an ODM like Mongoose chances are you don't need this and can delete this class.
 * In that case your Model's methods will return corresponding Mongoose method results,
 * with associations handled by the ODM, as necessary.
 */
module.exports =
  class MongoCollection extends Collection {
    constructor(parent, childmodel, db, datastore, property) {
      super(parent, childmodel, db, datastore, property);
      if(!(db instanceof MongoDatabase)) throw new Error('MongoCollection can only work with MongoDatabase');
    }

    async save() {
      const saves = [];
      try {
        for (let i = 0; i < this.length; i++) {
          saves.push(this[i].save());
        }        
        await Promise.all(saves);
      } catch (err) {
        Logger.error(`Could not save ${this.recods.length} associated records of ${Utils.getCurrentClassName(this.model)}`);
        Logger.error(err);
      }
    }

    //obtain all child records that match the query or just all child records in general
    async get(query){
      let records;
      if(!query){
        query = { [this.property]: this.parent.id };
      }
      let cursor = await this.db.select(query, this.datastore);      
      //TODO: limit this somehow
      records = await cursor.toArray();
      if(this.datastore !== this.childmodel.DATASTORE){
        //is an intermediate collection, traverse to child's
        records = await this.childmodel.DB.select({ _id: records.map(r=>new mongodb.ObjectId(r[property])) }, this.childmodel.DATASTORE);
      }
      this.update(records);
      return this;
    }

    update(...moreRecords) {
      moreRecords = Utils.flatten(moreRecords);
      moreRecords = moreRecords.map(r=> r instanceof Model ? r : new this.childmodel(r));
      Utils.arrayMerge(this.records, moreRecords, (val1, val2) => (val1.id === val2.id));
    }
  }