import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Supplier, SupplierDocument } from "./entities/supplier.entity";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";

@Injectable()
export class SuppliersService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<SupplierDocument>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    const createdSupplier = new this.supplierModel(createSupplierDto);
    return createdSupplier.save();
  }

  async findAll(): Promise<Supplier[]> {
    return this.supplierModel.find({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.supplierModel.findById(id).exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return supplier;
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier> {
    const updatedSupplier = await this.supplierModel
      .findByIdAndUpdate(id, updateSupplierDto, { new: true })
      .exec();
    if (!updatedSupplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return updatedSupplier;
  }

  async remove(id: string): Promise<Supplier> {
    const deletedSupplier = await this.supplierModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();
    if (!deletedSupplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return deletedSupplier;
  }
}
